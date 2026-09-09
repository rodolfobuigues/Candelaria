import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { redondearPrecioVenta } from './precios.js';

describe('redondearPrecioVenta', () => {
  test('hasta 1000 redondea al múltiplo de 10 más cercano', () => {
    assert.equal(redondearPrecioVenta(994), 990);
    assert.equal(redondearPrecioVenta(996), 1000);
    assert.equal(redondearPrecioVenta(1000), 1000);
  });

  test('por encima de 1000 redondea siempre hacia arriba a 100', () => {
    assert.equal(redondearPrecioVenta(1001), 1100);
    assert.equal(redondearPrecioVenta(10100), 10100);
    assert.equal(redondearPrecioVenta(10101), 10200);
  });
});
