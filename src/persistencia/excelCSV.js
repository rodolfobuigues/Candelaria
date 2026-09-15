// Compatibilidad de CSV existente: usa la misma revisión segura que XLSX.
import { CAMPOS_EXCEL, MARCA_EXCEL, VERSION_EXCEL } from './excelContrato.js';
import { prepararRevisionExcel } from './excelRevision.js';

export function parsearCSV(texto) {
  const filas = []; let fila = []; let celda = ''; let comillas = false;
  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice];
    if (caracter === '"' && texto[indice + 1] === '"' && comillas) { celda += '"'; indice += 1; }
    else if (caracter === '"') comillas = !comillas;
    else if (caracter === ';' && !comillas) { fila.push(celda); celda = ''; }
    else if ((caracter === '\n' || caracter === '\r') && !comillas) {
      if (caracter === '\r' && texto[indice + 1] === '\n') indice += 1;
      fila.push(celda); if (fila.some(Boolean)) filas.push(fila); fila = []; celda = '';
    } else celda += caracter;
  }
  if (comillas) throw new Error('El CSV tiene comillas sin cerrar.');
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  const encabezados = filas.shift()?.map((valor) => valor.replace(/^\ufeff/, '').trim()) ?? [];
  if (new Set(encabezados).size !== encabezados.length) throw new Error('El CSV contiene columnas duplicadas.');
  return filas.map((valores) => Object.fromEntries(encabezados.map((encabezado, indice) => [encabezado, valores[indice] ?? ''])));
}

export function prepararRevisionCSV(contenido, clave, estado) {
  const nombres = { insumos: 'Insumos', productos: 'Productos', combos: 'Combos' };
  const nombre = nombres[clave]; if (!nombre) throw new Error('Tipo de CSV no admitido.');
  const filas = parsearCSV(contenido); if (!filas.length) throw new Error('El archivo no contiene filas.');
  const extras = []; const lineas = [];
  const normalizados = filas.map((fila) => {
    const codigo = fila.codigo || fila.id;
    const original = estado[clave].find((registro) => fila.id ? registro.id === fila.id : registro.codigo === codigo);
    if (!codigo || !fila.nombre) throw new Error('Cada fila CSV debe tener código y nombre.');
    const registro = { ...(original ?? {}), ...fila, id: fila.id || original?.id || '', codigo, activo: fila.activo ?? original?.activo ?? true };
    // El CSV anterior usaba punto decimal sin miles. Se acepta solo esa
    // representación inequívoca, además de la coma del formato vigente.
    for (const campo of CAMPOS_EXCEL[nombre].filter((item) => item.tipo === 'numero')) {
      const valor = registro[campo.clave];
      if (typeof valor === 'string' && /^\d+\.\d+$/.test(valor)) registro[campo.clave] = Number(valor);
    }
    if (clave === 'productos') {
      const heredaId = fila.heredaCostoDe ?? original?.heredaCostoDe;
      const hereda = estado.productos.find((producto) => producto.id === heredaId);
      if (heredaId && !hereda) throw new Error(`Producto heredado inexistente: ${heredaId}. No se modificó ningún dato.`);
      registro.heredaCodigo = hereda?.codigo ?? '';
      if ('extras' in fila) {
        const lista = JSON.parse(fila.extras);
        if (!Array.isArray(lista)) throw new Error('La columna extras debe contener una lista JSON.');
        lista.forEach((extra) => extras.push({ id: registro.id, codigo, insumoCodigo: estado.insumos.find((insumo) => insumo.id === extra.insumoId)?.codigo ?? extra.insumoId, cantidad: extra.cantidad }));
      }
    }
    if (clave === 'combos') {
      const lista = JSON.parse(fila.lineas ?? JSON.stringify(original?.lineas ?? []));
      if (!Array.isArray(lista)) throw new Error('La columna lineas debe contener una lista JSON.');
      lista.forEach((linea) => lineas.push({ id: registro.id, codigo, tipo: linea.tipo, refCodigo: estado[linea.tipo === 'PRODUCTO' ? 'productos' : 'insumos'].find((item) => item.id === linea.refId)?.codigo ?? linea.refId, cantidad: linea.cantidad }));
    }
    return registro;
  });
  const hoja = (titulo, registros) => ({ nombre: titulo, filas: [CAMPOS_EXCEL[titulo].map((campo) => campo.titulo), ...registros.map((registro) => CAMPOS_EXCEL[titulo].map((campo) => registro[campo.clave] ?? ''))] });
  const hojas = [{ nombre: 'Instrucciones', filas: [[MARCA_EXCEL], ['Versión', VERSION_EXCEL]] }, hoja(nombre, normalizados)];
  if (clave === 'combos') hojas.push(hoja('CombosLineas', lineas));
  if (clave === 'productos' && filas.some((fila) => 'extras' in fila)) {
    // Cuando solo algunas filas traen extras, las demás conservan sus listas.
    for (const registro of normalizados.filter((_, indice) => !('extras' in filas[indice]))) {
      const original = estado.productos.find((producto) => producto.id === registro.id);
      for (const extra of original?.extras ?? []) extras.push({ id: registro.id, codigo: registro.codigo, insumoCodigo: estado.insumos.find((insumo) => insumo.id === extra.insumoId)?.codigo ?? extra.insumoId, cantidad: extra.cantidad });
    }
    hojas.push(hoja('ProductosExtras', extras));
  }
  return prepararRevisionExcel({ hojas }, estado);
}
