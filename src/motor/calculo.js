// Motor de costeo — ESPECIFICACION.md § 4.
// Funciones puras: no tocan IndexedDB ni la interfaz. Todo lo que necesitan
// entra por parámetro; nada se resuelve acá contra un catálogo.

import { redondearPrecioVenta } from '../config/precios.js';

export function techoMultiplo(valor, multiplo) {
  return Math.ceil(valor / multiplo) * multiplo;
}

export function calcularCostoUnitario(montoCompra, cantidadCompra) {
  return montoCompra / cantidadCompra;
}

/**
 * costosInsumos: costo unitario ya resuelto de los siete insumos fijos.
 * { ceraAltoPF, ceraBajoPF, pabilo, yeso, esencia, colorante, aceiteCoco }
 *
 * producto: { ceraAltoPF, ceraBajoPF, pabilo, yeso, minutosManoObra,
 *   recipienteCostoResuelto, recipienteCantidad, extras: [{costoUnitario, cantidad}] }
 *   `recipienteCostoResuelto` ya viene resuelto (ver resolverRecipienteCosto):
 *   este módulo no sigue la cadena de `heredaCostoDe`.
 *
 * parametros: ver src/config/parametros.js
 */
export function calcularCostoProducto(producto, costosInsumos, parametros) {
  const {
    ceraAltoPF = 0,
    ceraBajoPF = 0,
    pabilo = 0,
    yeso = 0,
    minutosManoObra = 0,
    recipienteCostoResuelto = 0,
    recipienteCantidad = 0,
    extras = [],
  } = producto;

  const {
    factorGastos,
    redondeo,
    beneficio,
    costoHoraManoObra,
    porcentajeEsencia,
    mlColorantePorGramoCera,
    unidadesCocoPorGramoCera,
  } = parametros;

  const ceraTotal = ceraAltoPF + ceraBajoPF;

  const esenciaG = ceraTotal > 0 ? (porcentajeEsencia / 100) * ceraTotal : 0;
  const coloranteMl = ceraTotal > 0 ? mlColorantePorGramoCera * ceraTotal : 0;
  const cocoU = ceraTotal > 0 ? unidadesCocoPorGramoCera * ceraTotal : 0;

  const costoCeraAlto = costosInsumos.ceraAltoPF * ceraAltoPF;
  const costoCeraBajo = costosInsumos.ceraBajoPF * ceraBajoPF;
  const costoPabilo = costosInsumos.pabilo * pabilo;
  const costoRecipiente = recipienteCostoResuelto * recipienteCantidad;
  const costoYeso = costosInsumos.yeso * (yeso / 1000);
  const costoEsencia = costosInsumos.esencia * esenciaG;
  const costoColorante = costosInsumos.colorante * coloranteMl;
  const costoCoco = costosInsumos.aceiteCoco * cocoU;
  const costoExtras = extras.reduce(
    (acumulado, extra) => acumulado + extra.costoUnitario * extra.cantidad,
    0
  );

  const materiales =
    costoCeraAlto +
    costoCeraBajo +
    costoPabilo +
    costoRecipiente +
    costoYeso +
    costoEsencia +
    costoColorante +
    costoCoco +
    costoExtras;

  const manoObra = (costoHoraManoObra * minutosManoObra) / 60;

  const subtotal = materiales + manoObra;

  const costoProduccion = techoMultiplo(subtotal * factorGastos, redondeo);
  const precio = redondearPrecioVenta(costoProduccion * (1 + beneficio));

  return {
    ceraTotal,
    esenciaG,
    coloranteMl,
    cocoU,
    costoCeraAlto,
    costoCeraBajo,
    costoPabilo,
    costoRecipiente,
    costoYeso,
    costoEsencia,
    costoColorante,
    costoCoco,
    costoExtras,
    materiales,
    manoObra,
    subtotal,
    costoProduccion,
    precio,
  };
}

/**
 * lineas: [{ tipo: 'PRODUCTO' | 'INSUMO', costoUnit, cantidad }]
 * `costoUnit` ya viene resuelto por quien arma la línea:
 *   - PRODUCTO → costoProduccion del producto (CON factorGastos)
 *   - INSUMO   → costoUnitario del insumo (SIN factorGastos)
 * Las dos asimetrías respecto del cálculo de producto son deliberadas
 * (ESPECIFICACION.md § 4.2) y no se "corrigen" acá.
 */
export function calcularCostoCombo(lineas, parametros) {
  const { beneficio } = parametros;

  const costoCombo = lineas.reduce(
    (acumulado, linea) => acumulado + linea.costoUnit * linea.cantidad,
    0
  );
  const precioCombo = redondearPrecioVenta(costoCombo * (1 + beneficio));

  return { costoCombo, precioCombo };
}

export function calcularIndicadores({ precio, subtotal, materiales, manoObra }) {
  return {
    margenSobreCosto: precio / subtotal - 1,
    pesoManoObra: manoObra / subtotal,
    // No descuenta la mano de obra: es intencional (ESPECIFICACION.md § 4.3).
    beneficioBruto: precio - materiales,
    beneficioNeto: precio - subtotal,
  };
}

/**
 * Sigue la cadena de `heredaCostoDe` hasta un producto sin padre y devuelve
 * su `recipienteCosto`. Rechaza ciclos (ESPECIFICACION.md § 3.2.1).
 *
 * productosPorId: Map<id, producto> donde producto tiene
 *   { id, recipienteCosto, heredaCostoDe }
 */
export function resolverRecipienteCosto(producto, productosPorId, visitados = new Set()) {
  if (!producto.heredaCostoDe) return producto.recipienteCosto;

  if (visitados.has(producto.id)) {
    throw new Error(`Ciclo de herencia de costo detectado en el producto ${producto.id}`);
  }

  const padre = productosPorId.get(producto.heredaCostoDe);
  if (!padre) {
    throw new Error(
      `El producto ${producto.id} hereda costo de un producto inexistente: ${producto.heredaCostoDe}`
    );
  }

  return resolverRecipienteCosto(padre, productosPorId, new Set(visitados).add(producto.id));
}
