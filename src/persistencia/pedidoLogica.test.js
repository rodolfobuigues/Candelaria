import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearPedido,
  registrarPago,
  anularPago,
  marcarEntregado,
  calcularDerivados,
} from './pedidoLogica.js';

function pedidoDeEjemplo() {
  return crearPedido({
    id: 'pedido-1',
    numero: 1,
    fecha: '2026-07-20T10:00:00.000Z',
    clienteNombre: 'Mara',
    clienteTelefono: '+54 9 11 5555-5555',
    lineas: [{ tipo: 'PRODUCTO', refId: 'V1', nombreCongelado: 'Pino chico', precioOriginal: 39500, precioAplicado: 39500, cantidad: 1 }],
  });
}

// total/pagado/saldo/estadoCobro son derivados de verdad: pedidoLogica.js
// nunca los pega al pedido que devuelve (eso vive solo en pedidosRepo.js,
// al leer). Por eso cada test los pide con calcularDerivados(pedido).

describe('crearPedido — no persiste derivados', () => {
  test('el pedido devuelto no trae total/pagado/saldo/estadoCobro', () => {
    const pedido = pedidoDeEjemplo();
    assert.equal('total' in pedido, false);
    assert.equal('pagado' in pedido, false);
    assert.equal('saldo' in pedido, false);
    assert.equal('estadoCobro' in pedido, false);
  });
});

// Criterio 11 — ESPECIFICACION.md § 8
describe('criterio 11 — seña y saldo', () => {
  test('una seña deja el pedido SEÑADO con el saldo correcto', () => {
    const pedido = pedidoDeEjemplo();
    assert.equal(calcularDerivados(pedido).total, 39500);

    const conSeña = registrarPago(pedido, {
      id: 'pago-1',
      fecha: '2026-07-20T10:05:00.000Z',
      monto: 15000,
      medio: 'EFECTIVO',
    });

    const derivados = calcularDerivados(conSeña);
    assert.equal(derivados.estadoCobro, 'SEÑADO');
    assert.equal(derivados.saldo, 24500);
    assert.equal(derivados.pagado, 15000);
  });

  test('el segundo pago que cubre el saldo pasa el pedido a PAGADO', () => {
    const pedido = pedidoDeEjemplo();
    const conSeña = registrarPago(pedido, {
      id: 'pago-1',
      fecha: '2026-07-20T10:05:00.000Z',
      monto: 15000,
      medio: 'EFECTIVO',
    });

    const pagado = registrarPago(conSeña, {
      id: 'pago-2',
      fecha: '2026-07-21T09:00:00.000Z',
      monto: 24500,
      medio: 'TRANSFERENCIA',
    });

    const derivados = calcularDerivados(pagado);
    assert.equal(derivados.estadoCobro, 'PAGADO');
    assert.equal(derivados.saldo, 0);
    assert.equal(derivados.pagado, 39500);
  });
});

// Criterio 12 — ESPECIFICACION.md § 8
describe('criterio 12 — rechazo de pago mayor al saldo', () => {
  test('un pago mayor al saldo pendiente se rechaza', () => {
    const pedido = pedidoDeEjemplo();
    const conSeña = registrarPago(pedido, {
      id: 'pago-1',
      fecha: '2026-07-20T10:05:00.000Z',
      monto: 15000,
      medio: 'EFECTIVO',
    });

    assert.throws(
      () =>
        registrarPago(conSeña, {
          id: 'pago-2',
          fecha: '2026-07-21T09:00:00.000Z',
          monto: 24501,
          medio: 'EFECTIVO',
        }),
      /supera el saldo pendiente/
    );

    // El rechazo no debe haber tocado el pedido original.
    assert.equal(calcularDerivados(conSeña).saldo, 24500);
    assert.equal(conSeña.pagos.length, 1);
  });

  test('un monto de pago menor o igual a cero se rechaza', () => {
    const pedido = pedidoDeEjemplo();
    assert.throws(
      () => registrarPago(pedido, { id: 'pago-1', fecha: '2026-07-20T10:05:00.000Z', monto: 0, medio: 'EFECTIVO' }),
      /mayor a cero/
    );
  });
});

// Criterio 13 — ESPECIFICACION.md § 8
describe('criterio 13 — historial completo con fechas', () => {
  test('el historial contiene creación, los dos pagos y la entrega, en orden', () => {
    let pedido = pedidoDeEjemplo();
    pedido = registrarPago(pedido, { id: 'pago-1', fecha: '2026-07-20T10:05:00.000Z', monto: 15000, medio: 'EFECTIVO' });
    pedido = registrarPago(pedido, { id: 'pago-2', fecha: '2026-07-21T09:00:00.000Z', monto: 24500, medio: 'TRANSFERENCIA' });
    pedido = marcarEntregado(pedido, '2026-07-21T18:00:00.000Z');

    assert.deepEqual(
      pedido.historial.map((evento) => evento.tipo),
      ['CREADO', 'PAGO', 'PAGO', 'ENTREGADO']
    );

    for (const evento of pedido.historial) {
      assert.ok(evento.fecha, `el evento ${evento.tipo} debe tener fecha`);
    }

    assert.deepEqual(
      pedido.historial.map((evento) => evento.fecha),
      [
        '2026-07-20T10:00:00.000Z',
        '2026-07-20T10:05:00.000Z',
        '2026-07-21T09:00:00.000Z',
        '2026-07-21T18:00:00.000Z',
      ]
    );
  });
});

// Criterio 14 — ESPECIFICACION.md § 8
describe('criterio 14 — anulación de pago', () => {
  test('anular un pago recalcula el saldo y lo deja visible como anulado', () => {
    let pedido = pedidoDeEjemplo();
    pedido = registrarPago(pedido, { id: 'pago-1', fecha: '2026-07-20T10:05:00.000Z', monto: 15000, medio: 'EFECTIVO' });
    assert.equal(calcularDerivados(pedido).saldo, 24500);

    const conAnulacion = anularPago(pedido, 'pago-1', '2026-07-20T12:00:00.000Z');

    const derivados = calcularDerivados(conAnulacion);
    assert.equal(derivados.saldo, 39500);
    assert.equal(derivados.pagado, 0);
    assert.equal(derivados.estadoCobro, 'IMPAGO');

    const pagoAnulado = conAnulacion.pagos.find((pago) => pago.id === 'pago-1');
    assert.equal(pagoAnulado.anulado, true);
    assert.equal(pagoAnulado.fechaAnulacion, '2026-07-20T12:00:00.000Z');
    // El pago anulado sigue visible, no se borra.
    assert.equal(conAnulacion.pagos.length, 1);

    assert.deepEqual(
      conAnulacion.historial.map((evento) => evento.tipo),
      ['CREADO', 'PAGO', 'PAGO_ANULADO']
    );
  });

  test('no se puede anular un pago inexistente ni uno ya anulado', () => {
    let pedido = pedidoDeEjemplo();
    pedido = registrarPago(pedido, { id: 'pago-1', fecha: '2026-07-20T10:05:00.000Z', monto: 15000, medio: 'EFECTIVO' });

    assert.throws(() => anularPago(pedido, 'no-existe', '2026-07-20T12:00:00.000Z'), /No existe el pago/);

    const anulado = anularPago(pedido, 'pago-1', '2026-07-20T12:00:00.000Z');
    assert.throws(() => anularPago(anulado, 'pago-1', '2026-07-20T13:00:00.000Z'), /ya está anulado/);
  });
});

describe('calcularDerivados', () => {
  test('un pedido sin pagos queda IMPAGO', () => {
    const pedido = pedidoDeEjemplo();
    const derivados = calcularDerivados(pedido);
    assert.equal(derivados.estadoCobro, 'IMPAGO');
    assert.equal(derivados.pagado, 0);
    assert.equal(derivados.saldo, 39500);
  });
});
