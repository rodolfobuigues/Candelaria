import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { calcularCostoProducto, calcularCostoCombo } from './calculo.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOLERANCIA = 0.01;

function parseCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  const encabezados = lineas[0].split(';');
  return lineas.slice(1).map((linea) => {
    const celdas = linea.split(';');
    const fila = {};
    encabezados.forEach((encabezado, i) => {
      fila[encabezado] = celdas[i] ?? '';
    });
    return fila;
  });
}

function numero(valor) {
  return valor === '' || valor === undefined ? 0 : parseFloat(valor);
}

function cercano(actual, esperado, mensaje) {
  assert.ok(
    Math.abs(actual - esperado) < TOLERANCIA,
    `${mensaje}: esperado ${esperado}, obtenido ${actual}`
  );
}

// --- Carga de fixtures ---------------------------------------------------

const insumosFixture = parseCSV(
  readFileSync(path.join(RAIZ, 'fixtures_insumos.csv'), 'utf8')
);

const productosFixture = parseCSV(
  readFileSync(path.join(RAIZ, 'fixtures_productos.csv'), 'utf8')
);

const combosFixture = JSON.parse(
  readFileSync(path.join(RAIZ, 'fixtures_combos.json'), 'utf8')
);

// Costo unitario "efectivo" de cada insumo: para los insumos con valor
// forzado (Bolsa gruesa, Caja exagonal — ESPECIFICACION.md § 7 regla 9),
// `esp_costo_prod` es el valor forzado; para el resto coincide con
// `esp_costo_unit`. El motor siempre usa el efectivo.
const insumosPorCodigo = new Map(
  insumosFixture.map((fila) => [fila.codigo, numero(fila.esp_costo_prod)])
);

function buscarInsumoPorNombre(...candidatos) {
  const fila = insumosFixture.find((f) =>
    candidatos.includes(f.nombre.trim().toLowerCase())
  );
  if (!fila) throw new Error(`No se encontró el insumo: ${candidatos.join(' / ')}`);
  return numero(fila.esp_costo_prod);
}

const costosInsumosFijos = {
  ceraAltoPF: buscarInsumoPorNombre('cera alto pf'),
  ceraBajoPF: buscarInsumoPorNombre('cera bajo pf'),
  pabilo: buscarInsumoPorNombre('pabilo'),
  yeso: buscarInsumoPorNombre('yeso'),
  esencia: buscarInsumoPorNombre('escencia', 'esencia'),
  colorante: buscarInsumoPorNombre('colorante'),
  aceiteCoco: buscarInsumoPorNombre('aceite de coco'),
};

// --- Insumos: el costo efectivo aplica los valores forzados ---------------

describe('fixtures_insumos.csv', () => {
  for (const fila of insumosFixture) {
    test(`${fila.codigo} — costo unitario efectivo`, () => {
      const esperado = numero(fila.esp_costo_prod);
      const obtenido = insumosPorCodigo.get(fila.codigo);
      cercano(obtenido, esperado, fila.codigo);
    });
  }
});

// --- Productos: los 79 vigentes del catálogo ------------------------------

const resultadosProducto = new Map();

describe('fixtures_productos.csv — calcularCostoProducto', () => {
  for (const fila of productosFixture) {
    test(`${fila.codigo} ${fila.nombre}`, () => {
      const producto = {
        ceraAltoPF: numero(fila.cera_alto_g),
        ceraBajoPF: numero(fila.cera_bajo_g),
        pabilo: numero(fila.pabilo_u),
        yeso: numero(fila.yeso_g),
        minutosManoObra: numero(fila.mo_min),
        recipienteCostoResuelto: numero(fila.recipiente_costo),
        recipienteCantidad: numero(fila.recipiente_u),
        extras: [],
      };

      const r = calcularCostoProducto(producto, costosInsumosFijos, PARAMETROS_INICIALES);
      resultadosProducto.set(fila.codigo, r);

      cercano(r.materiales, numero(fila.esp_materiales), 'materiales');
      cercano(r.subtotal, numero(fila.esp_subtotal), 'subtotal');
      cercano(r.costoProduccion, numero(fila.esp_costo_prod), 'costo de producción');
      cercano(r.precio, numero(fila.esp_precio), 'precio');
    });
  }

  test('cambiar el beneficio modifica los precios y ningún costo', () => {
    const parametrosConOtroBeneficio = { ...PARAMETROS_INICIALES, beneficio: 0.4 };

    for (const fila of productosFixture) {
      const producto = {
        ceraAltoPF: numero(fila.cera_alto_g),
        ceraBajoPF: numero(fila.cera_bajo_g),
        pabilo: numero(fila.pabilo_u),
        yeso: numero(fila.yeso_g),
        minutosManoObra: numero(fila.mo_min),
        recipienteCostoResuelto: numero(fila.recipiente_costo),
        recipienteCantidad: numero(fila.recipiente_u),
        extras: [],
      };

      const original = resultadosProducto.get(fila.codigo);
      const recalculado = calcularCostoProducto(
        producto,
        costosInsumosFijos,
        parametrosConOtroBeneficio
      );

      cercano(recalculado.subtotal, original.subtotal, `${fila.codigo} subtotal no debe cambiar`);
      cercano(
        recalculado.costoProduccion,
        original.costoProduccion,
        `${fila.codigo} costo de producción no debe cambiar`
      );
      cercano(
        recalculado.precio,
        recalculado.costoProduccion * 1.4,
        `${fila.codigo} precio debe reflejar el nuevo beneficio`
      );
    }
  });
});

// --- Combos ----------------------------------------------------------------

function resolverCostoUnitLinea(codigo) {
  if (resultadosProducto.has(codigo)) {
    return resultadosProducto.get(codigo).costoProduccion;
  }
  if (insumosPorCodigo.has(codigo)) {
    return insumosPorCodigo.get(codigo);
  }
  throw new Error(`Código de línea de combo no encontrado: ${codigo}`);
}

describe('fixtures_combos.json — calcularCostoCombo', () => {
  for (const combo of combosFixture) {
    test(`combo #${combo.id} ${combo.nombre}`, () => {
      const lineas = combo.lineas.map((linea) => {
        const costoUnit = resolverCostoUnitLinea(linea.codigo);
        cercano(costoUnit, linea.costo_unit, `${combo.id}/${linea.codigo} costo unitario de línea`);
        return { tipo: null, costoUnit, cantidad: linea.cant };
      });

      const { costoCombo, precioCombo } = calcularCostoCombo(lineas, PARAMETROS_INICIALES);

      cercano(costoCombo, combo.esp_costo, `combo ${combo.id} costo`);
      cercano(precioCombo, combo.esp_precio, `combo ${combo.id} precio`);
    });
  }
});
