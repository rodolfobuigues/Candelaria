import { formatearFecha, formatearImporte } from '../config/formato.js';
import { obtenerPlantilla } from '../config/plantillas.js';

function etiquetaMedio(medio) {
  return String(medio ?? '').replaceAll('_', ' ').toLocaleLowerCase('es-AR').replace(/^./, (letra) => letra.toLocaleUpperCase('es-AR'));
}

function reemplazarMarcadores(plantilla, datos) {
  return plantilla.replace(/\{(cliente|numero|fecha|detalle|total|pagado|saldo|montoPago|medioPago|motivo)\}/g, (_, clave) => datos[clave] ?? '');
}

export function construirMensajePedido(pedido, { tipo = 'confirmacion', pagoId = null, accionId = null } = {}) {
  const plantilla = obtenerPlantilla(tipo);
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
  });
}
