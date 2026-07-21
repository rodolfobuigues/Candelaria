import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisarArchivo, recorrerRepo, LISTA_BLANCA } from './guardaLiterales.cjs';
import F from './guardaLiterales.fixtures.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = path.join(__dirname, '..', '..');

function formatear(violaciones) {
  return violaciones
    .map((v) => `${v.archivo}:${v.linea} — ${v.tipo}: ${v.detalle}`)
    .join('\n');
}

test('el repo completo no tiene literales fuera de tokens.css', () => {
  const violaciones = recorrerRepo(RAIZ_REPO);
  assert.deepStrictEqual(violaciones, [], `Violaciones encontradas:\n${formatear(violaciones)}`);
});

test('tokens.css está exento aunque contenga hex, notación funcional de color y espaciado', () => {
  const violaciones = revisarArchivo('src/estilos/tokens.css', F.tokensCssComoTexto);
  assert.deepStrictEqual(violaciones, []);
});

test('detecta un hexadecimal fuera de tokens.css', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.hexEnCss);
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0].tipo, 'color-literal');
});

test('detecta notación funcional de color fuera de tokens.css', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.rgbaEnCss);
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0].tipo, 'color-literal');
});

test('detecta un radio de borde literal', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.radioLiteral);
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0].tipo, 'espaciado-literal');
});

test('detecta una sombra literal', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.sombraLiteral);
  assert.ok(violaciones.some((v) => v.tipo === 'espaciado-literal'));
  assert.ok(violaciones.some((v) => v.tipo === 'color-literal'));
});

test('detecta padding, margin y gap literales', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.espaciadoLiteral);
  assert.equal(violaciones.length, 3);
  assert.ok(violaciones.every((v) => v.tipo === 'espaciado-literal'));
});

test('no marca padding/margin/gap cuando usan var(--...)', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.espaciadoConTokens);
  assert.deepStrictEqual(violaciones, []);
});

test('detecta un enlace a una tipografía servida desde un CDN de Google', () => {
  const violaciones = revisarArchivo('index.html', F.linkFontsGoogleapis);
  assert.ok(violaciones.some((v) => v.tipo === 'fuente-remota'));
});

test('detecta una importación remota de CSS', () => {
  const violaciones = revisarArchivo('src/estilos/componentes.css', F.importRemoto);
  assert.ok(violaciones.some((v) => v.tipo === 'fuente-remota'));
});

test('detecta <link> a dominio externo', () => {
  const violaciones = revisarArchivo('index.html', F.linkExterno);
  assert.ok(violaciones.some((v) => v.tipo === 'fuente-remota'));
});

test('manifest.json exime theme_color y background_color, pero no otros hex', () => {
  const violaciones = revisarArchivo('manifest.json', F.manifestConExcepciones);
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0].detalle.slice(0, 7), F.hexNoEximidoManifest);
});

test('index.html exime el meta theme-color, pero no otros hex', () => {
  const violaciones = revisarArchivo('index.html', F.indexHtmlConMeta);
  assert.equal(violaciones.length, 1);
  assert.equal(violaciones[0].detalle.slice(0, 7), F.hexNoEximidoIndexHtml);
});

test('un .cjs no se revisa (fuera de la lista de extensiones)', () => {
  const violaciones = revisarArchivo('.claude/hooks/tokens-guard.cjs', F.regexHexComoCodigo);
  assert.deepStrictEqual(violaciones, []);
});

// --- Contrato de LISTA_BLANCA ---------------------------------------------
//
// El test anterior (repo completo) demuestra que hoy no hay violaciones,
// pero no protege la lista blanca en sí: si alguien la amplía, la achica o
// le cambia una ruta, el resto de los tests puede seguir en verde sin que
// nadie note que la exención cambió. Este test compara LISTA_BLANCA campo
// por campo contra el contenido exacto esperado, no contra "la incluye".

const LISTA_BLANCA_ESPERADA = {
  EXENTOS_COMPLETOS: [
    { ruta: 'src/estilos/tokens.css', motivo: 'es la fuente de verdad de los literales' },
    {
      ruta: 'src/estilos/guardaLiterales.cjs',
      motivo: 'el detector contiene por fuerza las cadenas que detecta',
    },
    {
      ruta: 'src/estilos/guardaLiterales.fixtures.cjs',
      motivo: 'ejemplos de violación usados por los tests del guardián',
    },
  ],
  EXENTOS_PARCIALES: [
    {
      ruta: 'manifest.json',
      claves: ['theme_color', 'background_color'],
      motivo: 'colores del manifiesto PWA, no de la interfaz',
    },
    {
      ruta: 'index.html',
      claves: ['<meta name="theme-color">'],
      motivo: 'refleja el mismo color del manifiesto en la barra del navegador',
    },
  ],
  NO_ESCANEADOS: [
    { ruta: 'node_modules/', motivo: 'dependencias de terceros' },
    { ruta: 'dist/', motivo: 'salida de build' },
    { ruta: 'coverage/', motivo: 'reportes de cobertura' },
    { ruta: '.git/', motivo: 'control de versiones' },
    { ruta: 'src/estilos/fuentes/', motivo: 'binarios (woff2) y licencias' },
    { ruta: 'package-lock.json', motivo: 'generado, no se edita a mano' },
  ],
};

test('LISTA_BLANCA es exactamente la esperada — ampliarla requiere autorización explícita', () => {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(LISTA_BLANCA)),
    LISTA_BLANCA_ESPERADA,
    'LISTA_BLANCA cambió respecto de lo esperado. Agregar, quitar o modificar ' +
      'una entrada de la lista blanca debilita la regla de literales durante la ' +
      'Fase 4 y requiere autorización explícita antes de actualizar este test.'
  );
});

// --- Exención efectiva vs. regla efectiva ---------------------------------
//
// Que una ruta figure en LISTA_BLANCA no prueba que esExentoCompleto() la
// reconozca en tiempo de ejecución (hoy compara con
// `norm.endsWith('/' + e.ruta)`, que es frágil). Se escribe un archivo
// temporal real con un literal prohibido y se revisa el mismo contenido en
// dos rutas: una exenta, una no. Los resultados tienen que ser opuestos.

function conArchivoTemporal(nombre, contenido, fn) {
  const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'candelaria-guarda-'));
  const archivo = path.join(dirTmp, nombre);
  fs.writeFileSync(archivo, contenido, 'utf8');
  try {
    return fn(fs.readFileSync(archivo, 'utf8'));
  } finally {
    fs.rmSync(dirTmp, { recursive: true, force: true });
  }
}

test('exención efectiva: un literal prohibido en una ruta exenta no se reporta', () => {
  conArchivoTemporal('tokens.css', F.colorYEspaciadoLiterales, (contenido) => {
    const violaciones = revisarArchivo('src/estilos/tokens.css', contenido);
    assert.deepStrictEqual(violaciones, []);
  });
});

test('regla efectiva: el mismo literal en una ruta no exenta sí se reporta', () => {
  conArchivoTemporal('componentes.css', F.colorYEspaciadoLiterales, (contenido) => {
    const violaciones = revisarArchivo('src/estilos/componentes.css', contenido);
    assert.ok(violaciones.some((v) => v.tipo === 'color-literal'));
    assert.ok(violaciones.some((v) => v.tipo === 'espaciado-literal'));
  });
});
