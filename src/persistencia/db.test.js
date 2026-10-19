import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, obtenerTodos, obtenerPorId, guardar, crear, actualizar, restaurarEstadoAtomico, eliminarPorId, eliminarTodo } from './db.js';
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
  test('un alta repetida no reemplaza datos, fotos ni extras existentes', async () => {
    const original = { id: 'V1', codigo: 'V1', nombre: 'Original', ceraAltoPF: 82, minutosManoObra: 45, fotos: ['data:image/png;base64,aA=='] };
    await crear(db, 'productos', original);
    await assert.rejects(() => crear(db, 'productos', { ...original, ceraAltoPF: 0, minutosManoObra: 0, fotos: [] }), /ya existe/);
    assert.deepEqual(await obtenerPorId(db, 'productos', 'V1'), original);
    await assert.rejects(() => crear(db, 'productos', { ...original, id: 'otro' }), /ya existe/);
    await assert.rejects(() => actualizar(db, 'productos', { ...original, id: 'ausente' }), /ya no existe/);
  });

  test('restauración transaccional revierte borrados y altas si una escritura falla', async () => {
    const original = { id: 'V1', codigo: 'V1', nombre: 'Original' };
    await guardar(db, 'productos', original);
    const previo = Object.fromEntries(await Promise.all(Object.values(TIENDAS).map(async (clave) => [clave, await obtenerTodos(db, clave)])));
    const destino = { ...previo, productos: [{ id: 'nuevo', codigo: 'V2', nombre: 'Nuevo' }, { id: 'otro', codigo: 'V2', nombre: 'Colisión' }] };
    await assert.rejects(() => restaurarEstadoAtomico(db, destino, previo), /se restauró el estado anterior/);
    assert.deepEqual(await obtenerTodos(db, 'productos'), [original]);
  });

  test('restaurar una copia preparada sobre datos obsoletos no pisa cambios nuevos', async () => {
    const previo = Object.fromEntries(await Promise.all(Object.values(TIENDAS).map(async (clave) => [clave, await obtenerTodos(db, clave)])));
    await guardar(db, 'combos', { id: 'nuevo', nombre: 'Creado en otra sesión' });
    await assert.rejects(() => restaurarEstadoAtomico(db, previo, previo), /datos cambiaron/);
    assert.equal((await obtenerTodos(db, 'combos')).length, 1);
  });
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

  test('eliminarPorId quita solo el registro indicado', async () => {
    await guardar(db, TIENDAS.COMBOS, { id: 'c1', nombre: 'Combo A' });
    await guardar(db, TIENDAS.COMBOS, { id: 'c2', nombre: 'Combo B' });

    await eliminarPorId(db, TIENDAS.COMBOS, 'c1');

    assert.equal(await obtenerPorId(db, TIENDAS.COMBOS, 'c1'), null);
    assert.equal((await obtenerTodos(db, TIENDAS.COMBOS)).length, 1);
  });
});
