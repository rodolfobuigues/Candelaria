import { test } from 'node:test';
import assert from 'node:assert/strict';
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
