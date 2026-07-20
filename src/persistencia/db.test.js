import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, obtenerTodos, obtenerPorId, guardar, eliminarTodo } from './db.js';
import { TIENDAS } from './esquema.js';

// Una sola conexión compartida: indexedDB.deleteDatabase() se queda colgado
// ("blocked") si queda alguna conexión abierta, así que entre tests vaciamos
// las tiendas en vez de borrar la base entera.
let db;

before(async () => {
  db = await abrirDB();
});

beforeEach(async () => {
  await Promise.all(Object.values(TIENDAS).map((tienda) => eliminarTodo(db, tienda)));
});

describe('db.js — adaptador de IndexedDB', () => {
  test('guardar y obtener un registro por id', async () => {
    const insumo = { id: 'i1', codigo: 'M1', nombre: 'Cera alto PF' };

    await guardar(db, TIENDAS.INSUMOS, insumo);

    assert.deepEqual(await obtenerPorId(db, TIENDAS.INSUMOS, 'i1'), insumo);
    assert.equal(await obtenerPorId(db, TIENDAS.INSUMOS, 'no-existe'), null);
  });

  test('obtenerTodos devuelve todos los registros de una tienda', async () => {
    await guardar(db, TIENDAS.PRODUCTOS, { id: 'p1', codigo: 'V1' });
    await guardar(db, TIENDAS.PRODUCTOS, { id: 'p2', codigo: 'V2' });

    const productos = await obtenerTodos(db, TIENDAS.PRODUCTOS);
    assert.equal(productos.length, 2);
    assert.deepEqual(
      productos.map((p) => p.codigo).sort(),
      ['V1', 'V2']
    );
  });

  test('eliminarTodo vacía la tienda', async () => {
    await guardar(db, TIENDAS.COMBOS, { id: 'c1', nombre: 'Combo A' });

    await eliminarTodo(db, TIENDAS.COMBOS);

    assert.deepEqual(await obtenerTodos(db, TIENDAS.COMBOS), []);
  });
});
