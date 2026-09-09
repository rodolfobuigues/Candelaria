// Lógica pura de pedidos — ESPECIFICACION.md § 3.5.
// Funciones puras, igual que el motor de costeo: no tocan IndexedDB ni
// generan fechas por su cuenta. Cada fecha entra por parámetro para que
// el resultado sea determinista y testeable contra los criterios 11-14
// de ESPECIFICACION.md § 8.
//
// total, pagado, saldo y estadoCobro son derivados de verdad: estas
// funciones NUNCA los pegan al objeto que devuelven. Quien los necesite
// llama calcularDerivados(pedido) — es la misma función que usa la capa
// de lectura (pedidosRepo.js) para no persistirlos nunca en IndexedDB y
// evitar que se desincronicen de `lineas`/`pagos`.
import { redondearPrecioVenta } from '../config/precios.js';

function calcularTotal(lineas) {
  return redondearPrecioVenta(lineas.reduce((acumulado, linea) => acumulado + linea.precioAplicado * linea.cantidad, 0));
}

function calcularPagado(pagos) {
  return pagos
    .filter((pago) => !pago.anulado)
    .reduce((acumulado, pago) => acumulado + pago.monto, 0);
}

function calcularEstadoCobro(pagado, total) {
  if (pagado <= 0) return 'IMPAGO';
  if (pagado < total) return 'SEÑADO';
  return 'PAGADO';
}

export function calcularDerivados(pedido) {
  const total = calcularTotal(pedido.lineas);
  const pagado = calcularPagado(pedido.pagos);
  const saldo = total - pagado;
  const estadoCobro = calcularEstadoCobro(pagado, total);
  return { total, pagado, saldo, estadoCobro };
}

function agregarEventoHistorial(historial, tipo, fecha, descripcion) {
  return [...historial, { tipo, fecha, descripcion }];
}

/**
 * datos: { id, numero, fecha, clienteNombre, clienteTelefono, notaInterna, lineas }
 * `lineas` ya vienen armadas por quien llama (tipo, refId, nombreCongelado,
 * precioOriginal, precioAplicado, cantidad) — ver § 3.5.1.
 */
export function crearPedido({
  id,
  numero,
  fecha,
  clienteNombre,
  clienteTelefono = '',
  notaInterna = '',
  lineas,
}) {
  const pedido = {
    id,
    numero,
    fecha,
    clienteNombre,
    clienteTelefono,
    notaInterna,
    estadoEntrega: 'PENDIENTE',
    lineas,
    pagos: [],
    historial: [],
  };

  const historial = agregarEventoHistorial(
    pedido.historial,
    'CREADO',
    fecha,
    `Pedido #${numero} creado para ${clienteNombre}.`
  );

  return { ...pedido, historial };
}

/**
 * pago: { id, fecha, monto, medio, nota }
 * Rechaza (criterio 12) si el monto es <= 0 o supera el saldo pendiente.
 */
export function registrarPago(pedido, { id, fecha, monto, medio, nota = '' }) {
  if (monto <= 0) {
    throw new Error('El monto del pago debe ser mayor a cero.');
  }

  const { saldo } = calcularDerivados(pedido);
  if (monto > saldo) {
    throw new Error(`El pago de ${monto} supera el saldo pendiente de ${saldo}.`);
  }

  const pago = { id, fecha, monto, medio, nota, anulado: false, fechaAnulacion: null };
  const pagos = [...pedido.pagos, pago];
  const pedidoConPago = { ...pedido, pagos };
  const { saldo: saldoResultante } = calcularDerivados(pedidoConPago);

  const historial = agregarEventoHistorial(
    pedido.historial,
    'PAGO',
    fecha,
    `Pago de ${monto} (${medio}). Saldo resultante: ${saldoResultante}.`
  );

  return { ...pedidoConPago, historial };
}

/**
 * Anula un pago existente: lo deja visible, tachado (`anulado: true`), con
 * `fechaAnulacion`, y recalcula el saldo sin contarlo (criterio 14).
 */
export function anularPago(pedido, pagoId, fechaAnulacion) {
  const pagoExistente = pedido.pagos.find((pago) => pago.id === pagoId);
  if (!pagoExistente) {
    throw new Error(`No existe el pago ${pagoId} en el pedido ${pedido.id}.`);
  }
  if (pagoExistente.anulado) {
    throw new Error(`El pago ${pagoId} ya está anulado.`);
  }

  const pagos = pedido.pagos.map((pago) =>
    pago.id === pagoId ? { ...pago, anulado: true, fechaAnulacion } : pago
  );
  const pedidoConAnulacion = { ...pedido, pagos };
  const { saldo: saldoResultante } = calcularDerivados(pedidoConAnulacion);

  const historial = agregarEventoHistorial(
    pedido.historial,
    'PAGO_ANULADO',
    fechaAnulacion,
    `Pago de ${pagoExistente.monto} anulado. Saldo resultante: ${saldoResultante}.`
  );

  return { ...pedidoConAnulacion, historial };
}

export function marcarEntregado(pedido, fecha) {
  if (pedido.estadoEntrega === 'ENTREGADO') {
    throw new Error(`El pedido ${pedido.id} ya está marcado como entregado.`);
  }

  const historial = agregarEventoHistorial(
    pedido.historial,
    'ENTREGADO',
    fecha,
    'Pedido marcado como entregado.'
  );

  return { ...pedido, estadoEntrega: 'ENTREGADO', historial };
}
