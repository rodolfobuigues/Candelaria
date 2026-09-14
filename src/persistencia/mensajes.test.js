import test from 'node:test';
import assert from 'node:assert/strict';
import { construirMensajePedido } from './mensajes.js';

const pedido = {
  id: 'p1', numero: 8, fecha: '2026-09-14T12:00:00Z', clienteNombre: 'Maira',
  lineas: [{ cantidad: 2, nombreCongelado: 'Vela', precioAplicado: 5000 }],
  pagos: [{ id: 'pago-1', monto: 3000, medio: 'MERCADO_PAGO', anulado: false }],
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
