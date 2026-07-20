import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, obtenerTodos, obtenerPorId, guardar, eliminarTodo } from './db.js';
import { exportarRespaldo, importarRespaldo } from './respaldo.js';
import { listarPedidos } from './pedidosRepo.js';
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

// Criterio 5 — ESPECIFICACION.md § 8: "Exportar e importar el respaldo
// devuelve una base idéntica."
describe('respaldo.js — exportación e importación', () => {
  test('exportar e importar devuelve una base idéntica', async () => {
    await guardar(db, TIENDAS.INSUMOS, { id: 'i1', codigo: 'M1', nombre: 'Cera alto PF', activo: true });
    await guardar(db, TIENDAS.PRODUCTOS, { id: 'p1', codigo: 'V1', nombre: 'Pino chico', activo: true });
    await guardar(db, TIENDAS.COMBOS, { id: 'c1', nombre: 'Combo A', activo: true });
    await guardar(db, TIENDAS.PARAMETROS, { id: 'global', beneficio: 0.35 });
    await guardar(db, TIENDAS.PEDIDOS, {
      id: 'ped1',
      numero: 1,
      clienteNombre: 'Mara',
      lineas: [{ tipo: 'PRODUCTO', refId: 'V1', nombreCongelado: 'Pino chico', precioOriginal: 10395, precioAplicado: 10395, cantidad: 1 }],
      pagos: [{ id: 'pago-1', fecha: '2026-07-20T10:00:00.000Z', monto: 5000, medio: 'EFECTIVO', nota: '', anulado: false, fechaAnulacion: null }],
      historial: [],
    });

    const respaldo = await exportarRespaldo(db);
    // listarPedidos() derivó total/pagado/saldo/estadoCobro al exportar:
    // el respaldo los trae, aunque IndexedDB nunca los tuvo guardados.
    assert.equal(respaldo.pedidos[0].total, 10395);
    assert.equal(respaldo.pedidos[0].pagado, 5000);
    assert.equal(respaldo.pedidos[0].saldo, 5395);
    assert.equal(respaldo.pedidos[0].estadoCobro, 'SEÑADO');

    // El registro guardado en IndexedDB, en cambio, nunca tuvo esos campos.
    const pedidoCrudo = await obtenerPorId(db, TIENDAS.PEDIDOS, 'ped1');
    assert.equal('total' in pedidoCrudo, false);
    assert.equal('estadoCobro' in pedidoCrudo, false);

    // Vaciamos la base para probar que la importación la reconstruye entera.
    await Promise.all(Object.values(TIENDAS).map((tienda) => guardar(db, tienda, { id: '__marcador__' })));
    await importarRespaldo(db, respaldo);

    const [insumos, productos, combos, parametros, pedidos] = await Promise.all([
      obtenerTodos(db, TIENDAS.INSUMOS),
      obtenerTodos(db, TIENDAS.PRODUCTOS),
      obtenerTodos(db, TIENDAS.COMBOS),
      obtenerTodos(db, TIENDAS.PARAMETROS),
      listarPedidos(db),
    ]);

    assert.deepEqual(insumos, respaldo.insumos);
    assert.deepEqual(productos, respaldo.productos);
    assert.deepEqual(combos, respaldo.combos);
    assert.deepEqual(parametros, respaldo.parametros);
    // pedidos también se compara vía listarPedidos: ambos lados derivan.
    assert.deepEqual(pedidos, respaldo.pedidos);

    // Y confirmamos que la reimportación tampoco dejó los derivados en
    // IndexedDB: guardarPedido() los despoja siempre.
    const pedidoReimportado = await obtenerPorId(db, TIENDAS.PEDIDOS, 'ped1');
    assert.equal('total' in pedidoReimportado, false);
    assert.equal('saldo' in pedidoReimportado, false);
  });

  test('el respaldo incluye version y fecha de exportación', async () => {
    const respaldo = await exportarRespaldo(db);
    assert.equal(respaldo.version, 1);
    assert.ok(respaldo.exportadoEn);
  });
});
