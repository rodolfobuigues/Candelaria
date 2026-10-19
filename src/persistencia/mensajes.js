import { formatearFecha, formatearImporte } from '../config/formato.js';
import { obtenerPlantilla } from '../config/plantillas.js';

function etiquetaMedio(medio) {
  return String(medio ?? '').replaceAll('_', ' ').toLocaleLowerCase('es-AR').replace(/^./, (letra) => letra.toLocaleUpperCase('es-AR'));
}

function reemplazarMarcadores(plantilla, datos, valoresCrudos, tipo) {
  return plantilla.split(/\r?\n/).filter((linea) => {
    if (linea.includes('{nota}')) return false;
    const claves = [...linea.matchAll(/\{(cliente|numero|fecha|detalle|total|pagado|saldo|montoPago|medioPago|motivo)\}/g)].map((match) => match[1]);
    if (!claves.length) return true;
    if (tipo === 'confirmacion' && !valoresCrudos.pagado && claves.every((clave) => clave === 'pagado' || clave === 'saldo')) return false;
    // En recibos y rectificaciones el cero informa el estado financiero real.
    // La supresión por cero corresponde a la confirmación sin seña.
    return !claves.every((clave) => (tipo === 'confirmacion' && valoresCrudos[clave] === 0) || valoresCrudos[clave] == null || valoresCrudos[clave] === '');
  }).map((linea) => linea.replace(/\{(cliente|numero|fecha|detalle|total|pagado|saldo|montoPago|medioPago|motivo)\}/g, (_, clave) => datos[clave] ?? '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function construirMensajePedido(pedido, { tipo = 'confirmacion', pagoId = null, accionId = null, plantilla: plantillaPersonalizada = null } = {}) {
  const plantilla = plantillaPersonalizada ?? obtenerPlantilla(tipo);
  if (!plantilla) throw new Error(`No existe la plantilla de mensaje ${tipo}.`);
  const pago = pagoId
    ? pedido.pagos.find((item) => String(item.id) === String(pagoId))
    : [...pedido.pagos].reverse().find((item) => !item.anulado);
  if ((tipo === 'pago' || tipo === 'pago_anulado') && !pago) throw new Error('No se encontró el pago para generar el mensaje.');
  const eventoCorreccion = tipo === 'entrega_corregida'
    ? [...pedido.historial].reverse().find((evento) => evento.tipo === 'REABIERTO' && (!accionId || String(evento.id) === String(accionId)))
    : null;
  const detalle = pedido.lineas
    .map((linea) => `• ${linea.cantidad} × ${linea.nombreCongelado} — ${formatearImporte(linea.precioAplicado * linea.cantidad)}`)
    .join('\n');
  const valoresCrudos = {
    cliente: pedido.clienteNombre, numero: pedido.numero, fecha: pedido.fecha, detalle,
    total: pedido.total, pagado: pedido.pagado, saldo: pedido.saldo,
    montoPago: pago?.monto ?? 0, medioPago: pago?.medio ?? '',
    motivo: pago?.motivoAnulacion ?? eventoCorreccion?.motivo ?? '',
  };
  return reemplazarMarcadores(plantilla, {
    cliente: pedido.clienteNombre,
    numero: pedido.numero,
    fecha: formatearFecha(pedido.fecha),
    detalle,
    total: formatearImporte(pedido.total),
    pagado: formatearImporte(pedido.pagado),
    saldo: formatearImporte(pedido.saldo),
    montoPago: pago ? formatearImporte(pago.monto) : '',
    medioPago: pago ? etiquetaMedio(pago.medio) : '',
    motivo: pago?.motivoAnulacion ?? eventoCorreccion?.motivo ?? '',
  }, valoresCrudos, tipo);
}
