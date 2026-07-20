import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, obtenerPorId, guardar, eliminarTodo } from './db.js';
import { obtenerPedido, listarPedidos, guardarPedido } from './pedidosRepo.js';
import { crearPedido, registrarPago } from './pedidoLogica.js';
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

function pedidoConSeña() {
  let pedido = crearPedido({
    id: 'ped1',
    numero: 1,
    fecha: '2026-07-20T10:00:00.000Z',
    clienteNombre: 'Mara',
    lineas: [{ tipo: 'PRODUCTO', refId: 'V1', nombreCongelado: 'Pino chico', precioOriginal: 39440, precioAplicado: 39440, cantidad: 1 }],
  });
  pedido = registrarPago(pedido, { id: 'pago-1', fecha: '2026-07-20T10:05:00.000Z', monto: 15000, medio: 'EFECTIVO' });
  return pedido; // total 39440, pagado 15000, saldo 24440, SEÑADO
}

describe('pedidosRepo — derivados reales, nunca persistidos', () => {
  test('los cuatro campos derivados falseados a mano en IndexedDB vuelven correctos al leer', async () => {
    const pedido = pedidoConSeña();

    // Escritura directa (bypaseando guardarPedido) con los cuatro campos
    // derivados falseados a propósito, simulando un dato corrupto o
    // desincronizado que haya quedado guardado en IndexedDB.
    await guardar(db, TIENDAS.PEDIDOS, {
      ...pedido,
      total: 1,
      pagado: 999999,
      saldo: -999999,
      estadoCobro: 'PAGADO',
    });

    const leidoPorId = await obtenerPedido(db, 'ped1');
    assert.equal(leidoPorId.total, 39440);
    assert.equal(leidoPorId.pagado, 15000);
    assert.equal(leidoPorId.saldo, 24440);
    assert.equal(leidoPorId.estadoCobro, 'SEÑADO');

    const [leidoEnLista] = await listarPedidos(db);
    assert.equal(leidoEnLista.total, 39440);
    assert.equal(leidoEnLista.pagado, 15000);
    assert.equal(leidoEnLista.saldo, 24440);
    assert.equal(leidoEnLista.estadoCobro, 'SEÑADO');
  });

  test('guardarPedido nunca persiste los campos derivados, aunque el objeto los traiga', async () => {
    const pedido = pedidoConSeña();

    await guardarPedido(db, { ...pedido, total: 1, pagado: 2, saldo: 3, estadoCobro: 'PAGADO' });

    const crudo = await obtenerPorId(db, TIENDAS.PEDIDOS, 'ped1');
    assert.equal('total' in crudo, false);
    assert.equal('pagado' in crudo, false);
    assert.equal('saldo' in crudo, false);
    assert.equal('estadoCobro' in crudo, false);

    // Pero al leerlo con la capa de lectura, los derivados vuelven a estar,
    // calculados de verdad a partir de lineas/pagos.
    const leido = await obtenerPedido(db, 'ped1');
    assert.equal(leido.saldo, 24440);
    assert.equal(leido.estadoCobro, 'SEÑADO');
  });

  test('obtenerPedido devuelve null si no existe, sin romper', async () => {
    assert.equal(await obtenerPedido(db, 'no-existe'), null);
  });
});
