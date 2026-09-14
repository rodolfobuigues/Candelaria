import test from 'node:test';
import assert from 'node:assert/strict';
import { construirDesgloseCombo } from './desgloseCombo.js';

test('suma los insumos de todos los productos y conserva la mano de obra total', () => {
  const insumos = [
    { id: 'M1', nombre: 'Cera alto PF', unidad: 'g', montoCompra: 1000, cantidadCompra: 1000 },
    { id: 'M4', nombre: 'Esencia', unidad: 'g', montoCompra: 2000, cantidadCompra: 100 },
    { id: 'M5', nombre: 'Pabilo', unidad: 'unidad', montoCompra: 1000, cantidadCompra: 10 },
    { id: 'X1', nombre: 'Colgante', unidad: 'unidad', montoCompra: 500, cantidadCompra: 5 },
    { id: 'A2', nombre: 'Tarjeta', unidad: 'unidad', montoCompra: 2000, cantidadCompra: 100 },
  ];
  const productos = [
    {
      id: 'P1', nombre: 'Producto 1', ceraAltoPF: 100, pabilo: 1, esenciaG: 7,
      costoCeraAlto: 100, costoPabilo: 100, costoEsencia: 140,
      recipienteCantidad: 1, costoRecipiente: 300, extras: [{ insumoId: 'X1', cantidad: 2 }],
      materiales: 840, minutosManoObra: 30, manoObra: 500,
    },
    {
      id: 'P2', nombre: 'Producto 2', ceraAltoPF: 50, pabilo: 0.5, esenciaG: 3.5,
      costoCeraAlto: 50, costoPabilo: 50, costoEsencia: 70,
      recipienteCantidad: 0, costoRecipiente: 0, extras: [{ insumoId: 'X1', cantidad: 1 }],
      materiales: 270, minutosManoObra: 15, manoObra: 250,
    },
  ];
  const combo = { lineas: [
    { tipo: 'PRODUCTO', refId: 'P1', cantidad: 2 },
    { tipo: 'PRODUCTO', refId: 'P2', cantidad: 1 },
    { tipo: 'INSUMO', refId: 'A2', cantidad: 3 },
  ] };

  const resultado = construirDesgloseCombo({ combo, productos, productosBase: productos, insumos });
  const porNombre = new Map(resultado.insumos.map((insumo) => [insumo.nombre, insumo]));

  assert.equal(porNombre.get('Cera alto PF').cantidad, 250);
  assert.equal(porNombre.get('Esencia').cantidad, 17.5);
  assert.equal(porNombre.get('Pabilo').cantidad, 2.5);
  assert.equal(porNombre.get('Colgante').cantidad, 5);
  assert.equal(porNombre.get('Recipiente · Producto 1').cantidad, 2);
  assert.equal(porNombre.get('Tarjeta').cantidad, 3);
  assert.equal(resultado.insumos.reduce((total, insumo) => total + insumo.costo, 0), 2010);
  assert.equal(resultado.materiales, 2010);
  assert.equal(resultado.minutos, 75);
  assert.equal(resultado.manoObra, 1250);
});
