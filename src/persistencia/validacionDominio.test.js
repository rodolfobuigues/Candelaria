import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construirInsumos, construirProductos, construirCombos } from '../desarrollo/siembra.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';
import { guardarParametros, obtenerParametrosVigentes } from '../config/parametrosRepo.js';
import { abrirDB, obtenerTodos } from './db.js';
import { validarEstado } from './validacionDominio.js';

function historico() {
  const leer = (archivo) => readFileSync(new URL(`../../${archivo}`, import.meta.url), 'utf8');
  const insumos = construirInsumos(leer('fixtures_insumos.csv'));
  const productos = construirProductos(leer('fixtures_productos.csv'));
  const combos = construirCombos(JSON.parse(leer('fixtures_combos.json')), new Set(productos.map((p) => p.codigo)));
  return { insumos, productos, combos, parametros: [{ ...PARAMETROS_INICIALES, id: 'actuales' }], pedidos: [] };
}

test('el validador admite el estado histórico completo sin alterar recetas', () => {
  const estado = historico(); const previo = structuredClone(estado);
  assert.equal(validarEstado(estado), estado);
  assert.deepEqual(estado, previo);
  assert.equal(estado.insumos.length, 29); assert.equal(estado.productos.length, 79); assert.equal(estado.combos.length, 21);
});

test('el respaldo histórico con redondeo cero o cantidad de compra cero es inválido', () => {
  const estado = historico();
  estado.parametros[0].redondeo = 0;
  assert.throws(() => validarEstado(estado), /Redondeo/);
  estado.parametros[0].redondeo = 100; estado.insumos[0].cantidadCompra = 0;
  assert.throws(() => validarEstado(estado), /Cantidad de compra/);
});

test('se rechazan referencias ausentes y ciclos de costo antes de restaurar', () => {
  const estado = historico();
  estado.productos[0].heredaCostoDe = estado.productos[1].id;
  estado.productos[1].heredaCostoDe = estado.productos[0].id;
  assert.throws(() => validarEstado(estado), /circular/);
  estado.productos[0].heredaCostoDe = null; estado.productos[1].heredaCostoDe = null;
  estado.combos[0].lineas[0].refId = 'inexistente';
  assert.throws(() => validarEstado(estado), /falta el componente/);
});

test('guardar parámetros inválidos hace cero escrituras y conserva plantillas', async () => {
  const db = await abrirDB();
  await guardarParametros(db, { ...PARAMETROS_INICIALES, plantillas: { confirmacion: 'Plantilla guardada' } });
  await assert.rejects(() => guardarParametros(db, { redondeo: 0 }), /Redondeo/);
  const actual = await obtenerParametrosVigentes(db);
  assert.equal(actual.redondeo, 100); assert.equal(actual.plantillas.confirmacion, 'Plantilla guardada');
  assert.equal((await obtenerTodos(db, 'parametros')).length, 1);
  await guardarParametros(db, { costoHoraManoObra: 7500 });
  assert.equal((await obtenerParametrosVigentes(db)).plantillas.confirmacion, 'Plantilla guardada');
});
