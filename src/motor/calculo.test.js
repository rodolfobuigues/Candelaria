import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  techoMultiplo,
  calcularCostoUnitario,
  calcularCostoProducto,
  calcularCostoCombo,
  calcularIndicadores,
  resolverRecipienteCosto,
} from './calculo.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';

describe('techoMultiplo', () => {
  test('redondea hacia arriba al múltiplo', () => {
    assert.equal(techoMultiplo(7618.24, 100), 7700);
    assert.equal(techoMultiplo(100, 100), 100);
    assert.equal(techoMultiplo(0, 100), 0);
  });
});

describe('calcularCostoUnitario', () => {
  test('monto pagado / cantidad comprada — ejemplo de ESPECIFICACION.md § 3.1', () => {
    // Pagué 3.905 por 2 paquetes de 1.000 g de cera.
    assert.equal(calcularCostoUnitario(3905, 2000), 1.9525);
  });
});

describe('calcularCostoProducto — caso de referencia V1 Pino chico (§ 8)', () => {
  test('reproduce materiales, subtotal, costo de producción y precio', () => {
    const costosInsumos = {
      ceraAltoPF: 7.81,
      ceraBajoPF: 7.5,
      pabilo: 100,
      yeso: 1350,
      esencia: 150,
      colorante: 170,
      aceiteCoco: 18000,
    };
    const producto = {
      ceraAltoPF: 82,
      ceraBajoPF: 0,
      pabilo: 0.5,
      yeso: 0,
      minutosManoObra: 45,
      recipienteCostoResuelto: 0,
      recipienteCantidad: 0,
      extras: [],
    };

    const r = calcularCostoProducto(producto, costosInsumos, PARAMETROS_INICIALES);

    assert.ok(Math.abs(r.materiales - 1869.85) < 0.01);
    assert.ok(Math.abs(r.subtotal - 7119.85) < 0.01);
    assert.equal(r.costoProduccion, 7700);
    assert.equal(r.precio, 10395);
  });

  test('las cantidades derivadas de la cera se anulan si no hay cera', () => {
    const costosInsumos = {
      ceraAltoPF: 7.81,
      ceraBajoPF: 7.5,
      pabilo: 100,
      yeso: 1350,
      esencia: 150,
      colorante: 170,
      aceiteCoco: 18000,
    };
    const producto = {
      ceraAltoPF: 0,
      ceraBajoPF: 0,
      pabilo: 0,
      yeso: 0,
      minutosManoObra: 10,
      recipienteCostoResuelto: 500,
      recipienteCantidad: 1,
      extras: [],
    };

    const r = calcularCostoProducto(producto, costosInsumos, PARAMETROS_INICIALES);

    assert.equal(r.esenciaG, 0);
    assert.equal(r.coloranteMl, 0);
    assert.equal(r.cocoU, 0);
    assert.equal(r.costoEsencia, 0);
    assert.equal(r.costoColorante, 0);
    assert.equal(r.costoCoco, 0);
  });
});

describe('calcularCostoCombo — ejemplo de ESPECIFICACION.md § 4.2', () => {
  test('4.700 + 200 + 95,588 + 450 = 5.445,588 → 7.400', () => {
    const lineas = [
      { tipo: 'PRODUCTO', costoUnit: 4700, cantidad: 1 },
      { tipo: 'INSUMO', costoUnit: 200, cantidad: 1 },
      { tipo: 'INSUMO', costoUnit: 95.58823529411765, cantidad: 1 },
      { tipo: 'INSUMO', costoUnit: 450, cantidad: 1 },
    ];

    const { costoCombo, precioCombo } = calcularCostoCombo(lineas, PARAMETROS_INICIALES);

    assert.ok(Math.abs(costoCombo - 5445.588) < 0.01);
    assert.equal(precioCombo, 7400);
  });
});

describe('calcularIndicadores', () => {
  test('el beneficio bruto no descuenta la mano de obra', () => {
    const ind = calcularIndicadores({
      precio: 10395,
      subtotal: 7119.85,
      materiales: 1869.85,
      manoObra: 5250,
    });

    assert.ok(Math.abs(ind.beneficioBruto - (10395 - 1869.85)) < 0.01);
    assert.ok(Math.abs(ind.beneficioNeto - (10395 - 7119.85)) < 0.01);
    assert.ok(ind.beneficioBruto > ind.beneficioNeto);
  });
});

describe('resolverRecipienteCosto', () => {
  test('sigue la cadena de heredaCostoDe hasta el producto raíz', () => {
    const productosPorId = new Map([
      ['A', { id: 'A', recipienteCosto: 1000, heredaCostoDe: null }],
      ['B', { id: 'B', recipienteCosto: 0, heredaCostoDe: 'A' }],
      ['C', { id: 'C', recipienteCosto: 0, heredaCostoDe: 'B' }],
    ]);

    assert.equal(resolverRecipienteCosto(productosPorId.get('C'), productosPorId), 1000);
  });

  test('rechaza un ciclo', () => {
    const productosPorId = new Map([
      ['X', { id: 'X', recipienteCosto: 0, heredaCostoDe: 'Y' }],
      ['Y', { id: 'Y', recipienteCosto: 0, heredaCostoDe: 'X' }],
    ]);

    assert.throws(() => resolverRecipienteCosto(productosPorId.get('X'), productosPorId));
  });

  test('rechaza una referencia a un producto inexistente', () => {
    const productosPorId = new Map([
      ['A', { id: 'A', recipienteCosto: 0, heredaCostoDe: 'NO_EXISTE' }],
    ]);

    assert.throws(() => resolverRecipienteCosto(productosPorId.get('A'), productosPorId));
  });
});
