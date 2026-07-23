import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatearImporte, formatearCostoUnitario, formatearFecha, formatearFechaHora } from './formato.js';

const ESPACIO_DURO = ' ';

describe('formatearImporte — sin decimales, catálogo y pedidos', () => {
  test('importe de seis dígitos', () => {
    assert.equal(formatearImporte(123456), `$${ESPACIO_DURO}123.456`);
  });

  test('importe cero', () => {
    assert.equal(formatearImporte(0), `$${ESPACIO_DURO}0`);
  });

  test('el ejemplo verificado de ESPECIFICACION.md § 4.1', () => {
    assert.equal(formatearImporte(10395), `$${ESPACIO_DURO}10.395`);
  });

  test('no lleva decimales aunque el monto los tenga', () => {
    assert.equal(formatearImporte(10395.6), `$${ESPACIO_DURO}10.396`);
  });

  test('el separador es un espacio duro, no un espacio común', () => {
    const resultado = formatearImporte(1000);
    assert.ok(resultado.includes(ESPACIO_DURO), 'debe contener U+00A0');
    assert.ok(!resultado.includes('$ '), 'no debe haber un espacio común pegado al símbolo');
  });
});

describe('formatearCostoUnitario — dos decimales, receta e insumo', () => {
  test('dos decimales fijos, con coma', () => {
    assert.equal(formatearCostoUnitario(1.9525), `$${ESPACIO_DURO}1,95`);
  });

  test('completa con ceros si hace falta', () => {
    assert.equal(formatearCostoUnitario(7.5), `$${ESPACIO_DURO}7,50`);
  });

  test('importe cero con dos decimales', () => {
    assert.equal(formatearCostoUnitario(0), `$${ESPACIO_DURO}0,00`);
  });
});

describe('formatearFecha y formatearFechaHora', () => {
  test('formatearFecha en dd/mm/aaaa', () => {
    assert.equal(formatearFecha('2026-07-21T10:00:00.000Z'), '21/07/2026');
  });

  test('formatearFechaHora en 24 h, sin AM/PM', () => {
    const resultado = formatearFechaHora('2026-07-21T18:30:00.000Z');
    assert.match(resultado, /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
    assert.ok(!/[ap]\.?\s?m\.?/i.test(resultado), 'no debe aparecer AM/PM');
  });

  test('la medianoche se muestra como 00:00, no 24:00', () => {
    const medianoche = new Date(2026, 6, 21, 0, 0);
    assert.match(formatearFechaHora(medianoche), /00:00$/);
  });
});
