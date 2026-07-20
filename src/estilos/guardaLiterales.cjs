// Candelaria — guardaLiterales.cjs
//
// Única implementación de la regla CLAUDE.md / DISEÑO.md § 10.1: "Ningún
// archivo fuera de src/estilos/tokens.css puede contener un valor literal
// de color, radio de borde, sombra o espaciado, ni una referencia a fuente
// remota." La consumen dos lugares: el hook .claude/hooks/tokens-guard.cjs
// (un archivo, en cada edición) y el test de la suite (todo el repo).
'use strict';

const fs = require('fs');
const path = require('path');

const EXTENSIONES_REVISABLES = new Set([
  '.css', '.js', '.jsx', '.cjs', '.mjs', '.html', '.svg', '.json',
]);

// Lista blanca cerrada. Cada entrada existe por un motivo puntual, no por
// comodidad. Agregar, quitar o modificar una entrada acá debilita la regla
// durante la Fase 4 (interfaz) y requiere autorización explícita — hay un
// test en guardaLiterales.test.js que falla si esta constante cambia.
const LISTA_BLANCA = Object.freeze({
  // El archivo entero no se revisa.
  EXENTOS_COMPLETOS: Object.freeze([
    Object.freeze({
      ruta: 'src/estilos/tokens.css',
      motivo: 'es la fuente de verdad de los literales',
    }),
    Object.freeze({
      ruta: 'src/estilos/guardaLiterales.cjs',
      motivo: 'el detector contiene por fuerza las cadenas que detecta',
    }),
    Object.freeze({
      ruta: 'src/estilos/guardaLiterales.fixtures.cjs',
      motivo: 'ejemplos de violación usados por los tests del guardián',
    }),
  ]),
  // Solo esas claves quedan exentas; el resto del archivo sí se revisa.
  EXENTOS_PARCIALES: Object.freeze([
    Object.freeze({
      ruta: 'manifest.json',
      claves: Object.freeze(['theme_color', 'background_color']),
      motivo: 'colores del manifiesto PWA, no de la interfaz',
    }),
    Object.freeze({
      ruta: 'index.html',
      claves: Object.freeze(['<meta name="theme-color">']),
      motivo: 'refleja el mismo color del manifiesto en la barra del navegador',
    }),
  ]),
  // Binarios o dependencias: la regla no aplica, ni siquiera se leen.
  NO_ESCANEADOS: Object.freeze([
    Object.freeze({ ruta: 'node_modules/', motivo: 'dependencias de terceros' }),
    Object.freeze({ ruta: 'dist/', motivo: 'salida de build' }),
    Object.freeze({ ruta: 'coverage/', motivo: 'reportes de cobertura' }),
    Object.freeze({ ruta: '.git/', motivo: 'control de versiones' }),
    Object.freeze({ ruta: 'src/estilos/fuentes/', motivo: 'binarios (woff2) y licencias' }),
    Object.freeze({ ruta: 'package-lock.json', motivo: 'generado, no se edita a mano' }),
  ]),
});

// Derivado de LISTA_BLANCA.NO_ESCANEADOS: nombres de directorio excluidos en
// cualquier profundidad (node_modules, dist, coverage, .git) vs. una ruta
// puntual (src/estilos/fuentes). Una sola fuente para ambas formas.
const DIRECTORIOS_POR_NOMBRE = new Set(
  LISTA_BLANCA.NO_ESCANEADOS
    .filter((e) => e.ruta.endsWith('/') && !e.ruta.slice(0, -1).includes('/'))
    .map((e) => e.ruta.slice(0, -1))
);
const DIRECTORIOS_POR_RUTA = LISTA_BLANCA.NO_ESCANEADOS
  .filter((e) => e.ruta.endsWith('/') && e.ruta.slice(0, -1).includes('/'))
  .map((e) => e.ruta.slice(0, -1));
const ARCHIVOS_NO_ESCANEADOS = new Set(
  LISTA_BLANCA.NO_ESCANEADOS.filter((e) => !e.ruta.endsWith('/')).map((e) => e.ruta)
);

const PROPIEDADES_ESPACIADO = [
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'box-shadow',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'gap',
  'row-gap',
  'column-gap',
];

const RE_PROPIEDAD_ESPACIADO = new RegExp(
  `\\b(${PROPIEDADES_ESPACIADO.join('|')})\\s*:\\s*([^;"'\`\n]+)`,
  'g'
);
const RE_VALOR_LITERAL = /\d+(\.\d+)?(px|rem|em|%)/;
const RE_HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RE_COLOR_FUNCION = /\b(rgb|rgba|hsl|hsla)\(/g;
const RE_IMPORT_REMOTO = /@import\s+url\(/g;
const RE_LINK_EXTERNO = /<link\b[^>]*href=["'](?:https?:)?\/\/[^"']*["'][^>]*>/gi;
const RE_FUENTE_GOOGLE = /fonts\.(googleapis|gstatic)\.com/g;

function normalizar(rutaRelativa) {
  return rutaRelativa.split(path.sep).join('/');
}

function esExentoCompleto(rutaRelativa) {
  const norm = normalizar(rutaRelativa);
  return LISTA_BLANCA.EXENTOS_COMPLETOS.some((e) => norm === e.ruta || norm.endsWith('/' + e.ruta));
}

function exencionParcial(rutaRelativa) {
  const base = path.basename(rutaRelativa);
  return LISTA_BLANCA.EXENTOS_PARCIALES.find((e) => e.ruta === base) || null;
}

function esNoEscaneado(rutaRelativa) {
  const norm = normalizar(rutaRelativa);
  const base = path.basename(rutaRelativa);

  if (ARCHIVOS_NO_ESCANEADOS.has(base)) return true;
  if (norm.split('/').some((segmento) => DIRECTORIOS_POR_NOMBRE.has(segmento))) return true;
  return DIRECTORIOS_POR_RUTA.some((p) => norm === p || norm.startsWith(p + '/'));
}

function esArchivoRevisable(rutaRelativa) {
  if (esNoEscaneado(rutaRelativa)) return false;
  if (esExentoCompleto(rutaRelativa)) return false;
  return EXTENSIONES_REVISABLES.has(path.extname(rutaRelativa));
}

// Aplica las EXENTOS_PARCIALES: neutraliza solo las claves declaradas antes
// de escanear, para que el resto del archivo sí quede sujeto a la regla.
function prepararTexto(rutaRelativa, contenido) {
  const exencion = exencionParcial(rutaRelativa);
  if (!exencion) return contenido;

  if (exencion.ruta === 'manifest.json') {
    let texto = contenido;
    for (const clave of exencion.claves) {
      texto = texto.replace(new RegExp(`("${clave}"\\s*:\\s*)"[^"]*"`, 'g'), '$1"OK"');
    }
    return texto;
  }

  if (exencion.ruta === 'index.html') {
    return contenido.replace(/<meta\s+name=["']theme-color["'][^>]*>/gi, '<meta data-ok>');
  }

  return contenido;
}

function linea(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

function revisarArchivo(rutaRelativa, contenido) {
  const norm = normalizar(rutaRelativa);
  if (!esArchivoRevisable(norm)) return [];

  const texto = prepararTexto(norm, contenido);
  const violaciones = [];

  for (const re of [RE_HEX, RE_COLOR_FUNCION]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(texto))) {
      violaciones.push({
        archivo: norm,
        linea: linea(texto, m.index),
        tipo: 'color-literal',
        detalle: m[0],
      });
    }
  }

  RE_PROPIEDAD_ESPACIADO.lastIndex = 0;
  let mEsp;
  while ((mEsp = RE_PROPIEDAD_ESPACIADO.exec(texto))) {
    const [, propiedad, valor] = mEsp;
    if (RE_VALOR_LITERAL.test(valor)) {
      violaciones.push({
        archivo: norm,
        linea: linea(texto, mEsp.index),
        tipo: 'espaciado-literal',
        detalle: `${propiedad}: ${valor.trim()}`,
      });
    }
  }

  for (const re of [RE_FUENTE_GOOGLE, RE_IMPORT_REMOTO, RE_LINK_EXTERNO]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(texto))) {
      violaciones.push({
        archivo: norm,
        linea: linea(texto, m.index),
        tipo: 'fuente-remota',
        detalle: m[0].slice(0, 80),
      });
    }
  }

  return violaciones;
}

function recorrerRepo(raiz) {
  const violaciones = [];

  function recorrerDir(dirAbsoluto, relativoDir) {
    for (const nombre of fs.readdirSync(dirAbsoluto)) {
      const absoluto = path.join(dirAbsoluto, nombre);
      const relativo = relativoDir ? `${relativoDir}/${nombre}` : nombre;
      const stat = fs.statSync(absoluto);

      if (stat.isDirectory()) {
        if (DIRECTORIOS_POR_NOMBRE.has(nombre)) continue;
        if (DIRECTORIOS_POR_RUTA.includes(relativo)) continue;
        recorrerDir(absoluto, relativo);
        continue;
      }

      if (!stat.isFile()) continue;
      if (!esArchivoRevisable(relativo)) continue;

      const contenido = fs.readFileSync(absoluto, 'utf8');
      violaciones.push(...revisarArchivo(relativo, contenido));
    }
  }

  recorrerDir(raiz, '');
  return violaciones;
}

module.exports = {
  revisarArchivo,
  recorrerRepo,
  esArchivoRevisable,
  esExentoCompleto,
  esNoEscaneado,
  EXTENSIONES_REVISABLES,
  LISTA_BLANCA,
};
