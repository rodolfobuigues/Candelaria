import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMETROS_INICIALES } from './parametros.js';
import { validarParametros } from './validacionParametros.js';
import { inferirRolInsumo } from './insumosFijos.js';
import { calcularCostoProducto, calcularCostoUnitario, techoMultiplo } from '../motor/calculo.js';
import { redondearPrecioVenta } from './precios.js';

test('parámetros inválidos no llegan al cálculo ni producen precio cero', () => {
  for (const cambio of [{redondeo:0},{redondeo:1.5},{beneficio:-1},{factorGastos:0},{porcentajeEsencia:101},{costoHoraManoObra:Infinity}]) {
    const parametros = {...PARAMETROS_INICIALES,...cambio};
    assert.throws(()=>validarParametros(parametros));
    assert.throws(()=>calcularCostoProducto({}, {}, parametros));
  }
  assert.throws(()=>calcularCostoUnitario(100,0));
  assert.throws(()=>techoMultiplo(100,0));
  assert.throws(()=>redondearPrecioVenta(NaN));
  assert.throws(()=>redondearPrecioVenta(-1));
  assert.equal(redondearPrecioVenta(0),0);
});

test('los nombres antiguos prevalecen sobre códigos y el rol persiste al renombrar', () => {
  assert.equal(inferirRolInsumo({codigo:'M6',nombre:'Yeso'}),'yeso');
  assert.equal(inferirRolInsumo({codigo:'M6',nombre:'Yeso premium',rolMotor:'yeso'}),'yeso');
  assert.equal(inferirRolInsumo({codigo:'M1',nombre:'Cera premium'}),'ceraAltoPF');
});
