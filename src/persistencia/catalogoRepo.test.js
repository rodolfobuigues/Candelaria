import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, guardar, eliminarTodo } from './db.js';
import { obtenerCatalogo, invalidarCatalogo } from './catalogoRepo.js';
import { TIENDAS } from './esquema.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';
import { redondearPrecioVenta } from '../config/precios.js';

const TOLERANCIA = 0.01;
function cercano(actual, esperado, mensaje) {
  assert.ok(Math.abs(actual - esperado) < TOLERANCIA, `${mensaje}: esperado ${esperado}, obtenido ${actual}`);
}

// Los siete insumos fijos, con costos elegidos para que coincidan
// exactamente con el caso de referencia "V1 Pino chico" de
// ESPECIFICACION.md § 8 (montoCompra = costoUnitario buscado, cantidadCompra
// = 1, para no complicar el fixture con conversiones de unidad).
const INSUMOS_FIJOS = [
  { id: 'M1', codigo: 'M1', nombre: 'Cera alto pf', categoria: 'MATERIAL', unidad: 'g', montoCompra: 7.81, cantidadCompra: 1, activo: true },
  { id: 'M2', codigo: 'M2', nombre: 'Cera bajo pf', categoria: 'MATERIAL', unidad: 'g', montoCompra: 7.5, cantidadCompra: 1, activo: true },
  { id: 'M5', codigo: 'M5', nombre: 'Pabilo', categoria: 'MATERIAL', unidad: 'unidad', montoCompra: 100, cantidadCompra: 1, activo: true },
  { id: 'M6', codigo: 'M6', nombre: 'Yeso', categoria: 'MATERIAL', unidad: 'kg', montoCompra: 50, cantidadCompra: 1, activo: true },
  { id: 'M4', codigo: 'M4', nombre: 'Esencia', categoria: 'MATERIAL', unidad: 'ml', montoCompra: 150, cantidadCompra: 1, activo: true },
  { id: 'M3', codigo: 'M3', nombre: 'Colorante', categoria: 'MATERIAL', unidad: 'ml', montoCompra: 170, cantidadCompra: 1, activo: true },
  { id: 'M7', codigo: 'M7', nombre: 'Aceite de coco', categoria: 'MATERIAL', unidad: 'unidad', montoCompra: 18000, cantidadCompra: 1, activo: true },
];

const PRODUCTO_V1 = {
  id: 'V1', codigo: 'V1', nombre: 'Pino chico', categoria: 'VELA',
  ceraAltoPF: 82, ceraBajoPF: 0, pabilo: 0.5, yeso: 0, minutosManoObra: 45,
  recipienteCosto: 0, recipienteCantidad: 0, heredaCostoDe: null, extras: [], activo: true,
};

const COMBO_C1 = {
  id: 'C1', nombre: 'Combo test', activo: true,
  lineas: [
    { tipo: 'PRODUCTO', refId: 'V1', cantidad: 1 },
    { tipo: 'INSUMO', refId: 'M5', cantidad: 2 },
  ],
};

let db;

before(async () => {
  db = await abrirDB();
});

beforeEach(async () => {
  await Promise.all(Object.values(TIENDAS).map((tienda) => eliminarTodo(db, tienda)));
  invalidarCatalogo();
  for (const insumo of INSUMOS_FIJOS) await guardar(db, TIENDAS.INSUMOS, insumo);
  await guardar(db, TIENDAS.PRODUCTOS, PRODUCTO_V1);
  await guardar(db, TIENDAS.COMBOS, COMBO_C1);
});

describe('catalogoRepo — coincide con el motor', () => {
  test('V1 Pino chico reproduce el caso de referencia de ESPECIFICACION.md § 8', async () => {
    const { productos } = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const v1 = productos.find((p) => p.id === 'V1');

    cercano(v1.materiales, 1869.8533333333335, 'materiales');
    cercano(v1.subtotal, 7119.8533333333335, 'subtotal');
    cercano(v1.costoProduccion, 7700, 'costo de producción');
    cercano(v1.precio, redondearPrecioVenta(10395), 'precio');
  });

  test('el combo suma costoProduccion del producto (con factorGastos) más el insumo suelto (sin factorGastos)', async () => {
    const { combos } = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const c1 = combos.find((c) => c.id === 'C1');

    // costoCombo = costoProduccion(V1)*1 + costoUnitario(M5)*2 = 7700 + 200
    cercano(c1.costoCombo, 7900, 'costo del combo');
    cercano(c1.precioCombo, 10700, 'precio del combo');
  });
});

describe('catalogoRepo — memoización', () => {
  test('la segunda llamada con los mismos parámetros no recalcula', async () => {
    const primera = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const segunda = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    assert.strictEqual(primera, segunda, 'debe ser el mismo objeto: no se reconstruyó el catálogo');
  });

  test('cambiar el beneficio invalida y devuelve precios nuevos', async () => {
    const original = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const conOtroBeneficio = { ...PARAMETROS_INICIALES, beneficio: 0.4 };
    const recalculado = await obtenerCatalogo(db, conOtroBeneficio);

    assert.notStrictEqual(original, recalculado, 'debe ser un objeto nuevo: el catálogo se reconstruyó');
    const v1 = recalculado.productos.find((p) => p.id === 'V1');
    cercano(v1.costoProduccion, 7700, 'el costo de producción no cambia con el beneficio');
    cercano(v1.precio, redondearPrecioVenta(7700 * 1.4), 'el precio debe reflejar el nuevo beneficio');
  });

  test('cambiar un insumo requiere invalidarCatalogo() explícito — no se detecta solo', async () => {
    await obtenerCatalogo(db, PARAMETROS_INICIALES);

    await guardar(db, TIENDAS.INSUMOS, { ...INSUMOS_FIJOS[0], montoCompra: 999 });
    const sinInvalidar = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const v1SinInvalidar = sinInvalidar.productos.find((p) => p.id === 'V1');
    cercano(v1SinInvalidar.materiales, 1869.8533333333335, 'sigue con el costo viejo: la memoria no se invalidó sola');

    invalidarCatalogo();
    const invalidado = await obtenerCatalogo(db, PARAMETROS_INICIALES);
    const v1Invalidado = invalidado.productos.find((p) => p.id === 'V1');
    assert.notEqual(v1Invalidado.materiales, 1869.8533333333335, 'con invalidarCatalogo() el costo nuevo del insumo tiene que reflejarse');
  });
});
