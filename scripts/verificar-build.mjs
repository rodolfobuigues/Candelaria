import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const carpeta = new URL('../dist/', import.meta.url);
const archivos = (await readdir(new URL('assets/', carpeta))).filter((nombre) => nombre.endsWith('.js'));
const contenido = (await Promise.all(archivos.map((nombre) => readFile(new URL(`assets/${nombre}`, carpeta), 'utf8')))).join('\n');
for (const fuente of ['fixtures_insumos.csv', 'fixtures_productos.csv']) {
  const filas = (await readFile(new URL(`../${fuente}`, import.meta.url), 'utf8')).trim().split(/\r?\n/);
  assert.ok(!contenido.includes(filas[0]), `El build incluye la cabecera privada de ${fuente}.`);
  assert.ok(!filas.slice(1).some((fila) => contenido.includes(fila)), `El build incluye filas históricas de ${fuente}.`);
}
const recursos = JSON.parse(await readFile(new URL('recursos-pwa.json', carpeta), 'utf8'));
assert.ok(!recursos.some((ruta) => /excelLibro/.test(ruta)), 'El precaché público incluye Excel.');
assert.ok(recursos.some((ruta) => ruta.endsWith('.js')));
for (const ruta of recursos) await readFile(new URL(ruta, carpeta));
console.log(`Build verificado: ${archivos.length} archivos JavaScript, sin fixtures privadas; ${recursos.length} recursos de precaché, sin Excel.`);
