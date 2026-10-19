// Contrato puro compartido por motor, formularios e intercambios.
export function validarParametros(parametros) {
  if (!parametros || typeof parametros !== 'object' || Array.isArray(parametros)) throw new Error('Los parámetros deben ser un objeto.');
  const limites = {
    beneficio: ['Beneficio', 0], factorGastos: ['Factor de gastos', 1],
    redondeo: ['Redondeo', 1], costoHoraManoObra: ['Costo por hora', 0],
    porcentajeEsencia: ['Porcentaje de esencia', 0, 100],
    mlColorantePorGramoCera: ['Colorante por gramo de cera', 0],
    unidadesCocoPorGramoCera: ['Aceite de coco por gramo de cera', 0],
  };
  for (const [campo, [nombre, minimo, maximo]] of Object.entries(limites)) {
    const valor = parametros[campo];
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo || (maximo !== undefined && valor > maximo)) {
      throw new Error(`${nombre}: ingresá un número ${minimo === 1 ? 'mayor o igual a uno' : 'no negativo'}${maximo === undefined ? '' : ` y menor o igual a ${maximo}`}.`);
    }
  }
  if (!Number.isInteger(parametros.redondeo)) throw new Error('Redondeo: ingresá un entero mayor que cero.');
  if (parametros.telefonoComercial != null && (typeof parametros.telefonoComercial !== 'string' || (parametros.telefonoComercial !== '' && !/^\d{8,15}$/.test(parametros.telefonoComercial)))) {
    throw new Error('WhatsApp comercial: usá entre 8 y 15 dígitos, con código de país, o dejalo vacío.');
  }
  if (parametros.plantillas != null) {
    const ids = new Set(['confirmacion', 'pago', 'pago_anulado', 'recordatorio', 'entrega', 'entrega_corregida']);
    if (typeof parametros.plantillas !== 'object' || Array.isArray(parametros.plantillas)) throw new Error('Las plantillas deben ser un objeto.');
    for (const [id, texto] of Object.entries(parametros.plantillas)) {
      if (!ids.has(id) || typeof texto !== 'string' || texto.length > 20000) throw new Error(`Plantilla inválida: ${id}.`);
    }
  }
  return parametros;
}
