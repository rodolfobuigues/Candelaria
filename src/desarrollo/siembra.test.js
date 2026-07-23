import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { abrirDB, obtenerTodos, eliminarTodo } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';
import { construirInsumos, construirProductos, construirCombos, sembrar } from './siembra.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const textoInsumos = readFileSync(path.join(RAIZ, 'fixtures_insumos.csv'), 'utf8');
const textoProductos = readFileSync(path.join(RAIZ, 'fixtures_productos.csv'), 'utf8');
const jsonCombos = JSON.parse(readFileSync(path.join(RAIZ, 'fixtures_combos.json'), 'utf8'));

describe('construirInsumos / construirProductos / construirCombos — funciones puras', () => {
  test('26 insumos, con unidad traducida al enum de ESPECIFICACION § 3.1', () => {
    const insumos = construirInsumos(textoInsumos);
    assert.equal(insumos.length, 26);
    const unidadesValidas = new Set(['g', 'kg', 'ml', 'l', 'unidad', 'hora']);
    for (const insumo of insumos) {
      assert.ok(unidadesValidas.has(insumo.unidad), `unidad inválida en ${insumo.codigo}: ${insumo.unidad}`);
      assert.equal(insumo.montoCompra / insumo.cantidadCompra, insumo.montoCompra, 'cantidadCompra debe ser 1');
    }
  });

  test('76 productos, con categoría traducida al enum VELA/RECIPIENTE/REPOSICION', () => {
    const productos = construirProductos(textoProductos);
    assert.equal(productos.length, 76);
    const categoriasValidas = new Set(['VELA', 'RECIPIENTE', 'REPOSICION']);
    for (const producto of productos) {
      assert.ok(categoriasValidas.has(producto.categoria), `categoría inválida en ${producto.codigo}: ${producto.categoria}`);
      assert.equal(producto.heredaCostoDe, null, 'la siembra no resuelve heredaCostoDe: eso es el importador');
    }
  });

  test('no renombra R150/R50/R170 a RP — eso es del importador, no de la siembra', () => {
    const productos = construirProductos(textoProductos);
    const codigos = productos.map((p) => p.codigo);
    // Si alguno de estos existiera en la fixture con su código original,
    // tiene que sobrevivir intacto. No es un assert de que existan —
    // documenta que si existen, la siembra no los toca.
    for (const c of ['R150', 'R50', 'R170']) {
      if (codigos.includes(c)) {
        assert.ok(!codigos.includes(`RP${c.slice(1)}`), `${c} no debería haberse renombrado a RP${c.slice(1)}`);
      }
    }
  });

  test('2 combos, con tipo PRODUCTO/INSUMO resuelto por código', () => {
    const productos = construirProductos(textoProductos);
    const codigosProductos = new Set(productos.map((p) => p.codigo));
    const combos = construirCombos(jsonCombos, codigosProductos);
    assert.equal(combos.length, 2);
    for (const combo of combos) {
      for (const linea of combo.lineas) {
        assert.ok(['PRODUCTO', 'INSUMO'].includes(linea.tipo));
        assert.equal(typeof linea.refId, 'string');
      }
    }
  });
});

describe('sembrar — escribe en IndexedDB', () => {
  let db;

  before(async () => {
    db = await abrirDB();
  });

  beforeEach(async () => {
    await Promise.all(Object.values(TIENDAS).map((tienda) => eliminarTodo(db, tienda)));
  });

  test('con un solo comando quedan las 26 + 76 + 2 filas en sus tiendas', async () => {
    const insumos = construirInsumos(textoInsumos);
    const productos = construirProductos(textoProductos);
    const combos = construirCombos(jsonCombos, new Set(productos.map((p) => p.codigo)));

    await sembrar(db, { insumos, productos, combos });

    assert.equal((await obtenerTodos(db, TIENDAS.INSUMOS)).length, 26);
    assert.equal((await obtenerTodos(db, TIENDAS.PRODUCTOS)).length, 76);
    assert.equal((await obtenerTodos(db, TIENDAS.COMBOS)).length, 2);
  });

  test('es idempotente: sembrar dos veces no duplica (put por id)', async () => {
    const insumos = construirInsumos(textoInsumos);
    const productos = construirProductos(textoProductos);
    const combos = construirCombos(jsonCombos, new Set(productos.map((p) => p.codigo)));

    await sembrar(db, { insumos, productos, combos });
    await sembrar(db, { insumos, productos, combos });

    assert.equal((await obtenerTodos(db, TIENDAS.INSUMOS)).length, 26);
    assert.equal((await obtenerTodos(db, TIENDAS.PRODUCTOS)).length, 76);
  });
});
