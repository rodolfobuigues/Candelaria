import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..', '..');
const leer = (ruta) => fs.readFileSync(path.join(RAIZ, ruta), 'utf8');

test('el manifest instala Candelaria con iconos general y maskable', () => {
  const manifest = JSON.parse(leer('public/manifest.webmanifest'));
  assert.equal(manifest.start_url, '/Candelaria/');
  assert.equal(manifest.scope, '/Candelaria/');
  assert.ok(manifest.icons.some((icono) => icono.purpose === 'any' && icono.type === 'image/svg+xml'));
  assert.ok(manifest.icons.some((icono) => icono.purpose === 'maskable' && icono.type === 'image/svg+xml'));
  for (const icono of manifest.icons) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'public', path.basename(icono.src))));
  }
});

test('la PWA controla la actualización y solicita persistencia local', () => {
  const main = leer('src/interfaz/main.jsx');
  const aviso = leer('src/interfaz/comun/AvisoActualizacionPWA.jsx');
  const serviceWorker = leer('public/sw.js');

  assert.match(main, /navigator\.storage\.persisted\(\)/);
  assert.match(main, /navigator\.storage\.persist\(\)/);
  assert.match(main, /registro\.waiting/);
  assert.match(aviso, /ACTIVAR_ACTUALIZACION/);
  assert.match(serviceWorker, /ACTIVAR_ACTUALIZACION/);
  assert.match(serviceWorker, /origin !== self\.location\.origin/);
  assert.match(serviceWorker, /respuestaHtml\.text\(\)/);
  assert.match(serviceWorker, /cache\.addAll/);
  const manejadorInstall = serviceWorker.slice(
    serviceWorker.indexOf("self.addEventListener('install'"),
    serviceWorker.indexOf("self.addEventListener('activate'")
  );
  assert.doesNotMatch(manejadorInstall, /self\.skipWaiting\(\)/);
});
