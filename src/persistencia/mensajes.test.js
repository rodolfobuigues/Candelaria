import test from 'node:test';
import assert from 'node:assert/strict';
import { construirMensajePedido } from './mensajes.js';

const pedido = {
  id: 'p1', numero: 8, fecha: '2026-09-14T12:00:00Z', clienteNombre: 'Maira',
  lineas: [{ cantidad: 2, nombreCongelado: 'Vela', precioAplicado: 5000 }],
  pagos: [{ id: 'pago-1', monto: 3000, medio: 'MERCADO_PAGO', anulado: false, motivoAnulacion: null }],
  historial: [],
  total: 10000, pagado: 3000, saldo: 7000,
};

test('el mensaje de pago informa el pago puntual, total abonado y saldo', () => {
  const mensaje = construirMensajePedido(pedido, { tipo: 'pago', pagoId: 'pago-1' });
  assert.match(mensaje, /pago de \$\s?3\.000/i);
  assert.match(mensaje, /Mercado pago/);
  assert.match(mensaje, /Total abonado: \$\s?3\.000/);
  assert.match(mensaje, /Saldo pendiente: \$\s?7\.000/);
});

test('el mensaje de entrega identifica al cliente y al pedido', () => {
  const mensaje = construirMensajePedido(pedido, { tipo: 'entrega' });
  assert.match(mensaje, /Maira/);
  assert.match(mensaje, /pedido #8/);
  assert.match(mensaje, /entrega/i);
});

test('el mensaje de anulación informa pago, motivo y saldo actualizado', () => {
  const anulado = {
    ...pedido,
    pagos: [{ ...pedido.pagos[0], anulado: true, motivoAnulacion: 'Se cargó al pedido equivocado.' }],
    pagado: 0,
    saldo: 10000,
  };
  const mensaje = construirMensajePedido(anulado, { tipo: 'pago_anulado', pagoId: 'pago-1' });
  assert.match(mensaje, /pago de \$\s?3\.000/i);
  assert.match(mensaje, /Se cargó al pedido equivocado/);
  assert.match(mensaje, /Total abonado actualizado: \$\s?0/);
  assert.match(mensaje, /Saldo pendiente: \$\s?10\.000/);
});

test('el mensaje de corrección de entrega incluye el motivo', () => {
  const corregido = {
    ...pedido,
    historial: [{ tipo: 'REABIERTO', id: 'correccion-1', motivo: 'Todavía no fue retirado.' }],
  };
  const mensaje = construirMensajePedido(corregido, { tipo: 'entrega_corregida', accionId: 'correccion-1' });
  assert.match(mensaje, /continúa pendiente de entrega/i);
  assert.match(mensaje, /Todavía no fue retirado/);
});
