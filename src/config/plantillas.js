export const MARCADORES = ['{cliente}', '{numero}', '{fecha}', '{detalle}', '{total}', '{pagado}', '{saldo}'];
export const PLANTILLAS_INICIALES = {
  confirmacion: '¡Hola {cliente}! Tu pedido #{numero} fue confirmado 🕯️\n\n{detalle}\n\nTotal: {total}\nSeña recibida: {pagado}\nSaldo: {saldo}\n\n¡Gracias por elegir Candelaria!',
  pago: '¡Hola {cliente}! Registré tu pago de {pagado} para el pedido #{numero}.\nSaldo pendiente: {saldo}. ¡Gracias!',
  recordatorio: 'Hola {cliente}, te recuerdo que tu pedido #{numero} tiene un saldo pendiente de {saldo}.',
};

export function obtenerPlantilla(id) {
  return globalThis.localStorage?.getItem(`candelaria-plantilla-${id}`) ?? PLANTILLAS_INICIALES[id];
}

export function guardarPlantilla(id, texto) {
  globalThis.localStorage?.setItem(`candelaria-plantilla-${id}`, texto);
}
