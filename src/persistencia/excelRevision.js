import { CAMPOS_EXCEL, ENTIDADES_EXCEL, HOJAS_PEDIDOS, VERSION_EXCEL, MARCA_EXCEL, firmaEstadoExcel, iguales } from './excelContrato.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';
import { calcularCatalogoDesdeDatos } from './catalogoRepo.js';

const texto = (valor) => String(valor ?? '').trim();
const normalizar = (valor) => texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const clon = (valor) => structuredClone(valor);
const UNIDADES = new Set(['g', 'kg', 'ml', 'l', 'unidad', 'hora']);
const CATEGORIAS = new Set(['VELA', 'RECIPIENTE', 'REPOSICION']);
// Excel conserva 15 cifras significativas. Una diferencia causada solamente
// por esa serialización no debe corregir ni reescribir el valor vigente.
function conservarPrecisionExcel(valor, anterior) {
  return typeof valor === 'number' && typeof anterior === 'number' && valor.toPrecision(15) === anterior.toPrecision(15) ? anterior : valor;
}

function valorCampo(valor, campo) {
  if (valor && typeof valor === 'object') throw new Error('contiene una fórmula o un valor no admitido; revisalo antes de importar');
  if (campo.tipo === 'numero') {
    const numero = typeof valor === 'number' ? valor : /^\d+(?:,\d+)?$/.test(texto(valor)) ? Number(texto(valor).replace(',', '.')) : NaN;
    if (!Number.isFinite(numero) || numero < 0 || (campo.positivo && numero <= 0) || (campo.entero && !Number.isInteger(numero))) {
      throw new Error(`debe ser un número ${campo.positivo ? 'mayor a cero' : 'no negativo'}${campo.entero ? ' entero' : ''}; usá una celda numérica`);
    }
    return numero;
  }
  if (campo.tipo === 'booleano') {
    if (valor === true || ['si', 'true', '1'].includes(normalizar(valor))) return true;
    if (valor === false || ['no', 'false', '0'].includes(normalizar(valor))) return false;
    throw new Error('debe indicar Sí o No');
  }
  return texto(valor);
}

function leerFilas(libro, nombre, errores) {
  const hoja = libro.hojas.find((item) => item.nombre === nombre);
  if (!hoja) return null;
  const campos = CAMPOS_EXCEL[nombre].filter((campo) => campo.tipo !== 'calculado');
  const encabezados = (hoja.filas[0] ?? []).map(normalizar);
  for (const campo of campos) {
    const titulo = normalizar(campo.titulo);
    if (!encabezados.includes(titulo)) errores.push({ hoja: nombre, fila: 1, campo: campo.titulo, mensaje: 'falta esta columna obligatoria' });
    if (encabezados.filter((item) => item === titulo).length > 1) errores.push({ hoja: nombre, fila: 1, campo: campo.titulo, mensaje: 'la columna está duplicada' });
  }
  return hoja.filas.slice(1).flatMap((fila, indice) => {
    if (!fila.some((valor) => texto(valor) !== '')) return [];
    const registro = { _hoja: nombre, _fila: indice + 2 };
    for (const campo of campos) {
      try { registro[campo.clave] = valorCampo(fila[encabezados.indexOf(normalizar(campo.titulo))], campo); }
      catch (error) { errores.push({ hoja: nombre, fila: registro._fila, campo: campo.titulo, mensaje: error.message }); }
    }
    return [registro];
  });
}

function parametrosVigentes(estado) {
  return { ...PARAMETROS_INICIALES, ...(estado.parametros.find((registro) => registro.id === 'actuales') ?? {}) };
}

// Solo prepara y calcula en memoria. Nunca escribe ni consulta Supabase.
export function prepararRevisionExcel(libro, estado) {
  const errores = []; const advertencias = [];
  const instruccion = libro.hojas.find((hoja) => hoja.nombre === 'Instrucciones');
  if (instruccion?.filas[0]?.[0] !== MARCA_EXCEL || Number(instruccion?.filas[1]?.[1]) !== VERSION_EXCEL) {
    errores.push({ hoja: 'Archivo', fila: 1, mensaje: 'no es una planilla de intercambio exportada por Candelaria. Exportá el catálogo vigente; no uses el Excel histórico como carga inicial' });
  }
  const candidatos = clon(estado); const filasPorClave = {}; const presentados = {};
  for (const [nombre, clave] of ENTIDADES_EXCEL) {
    const filas = leerFilas(libro, nombre, errores); filasPorClave[clave] = filas;
    const porId = new Map((estado[clave] ?? []).map((registro) => [registro.id, registro]));
    if (clave === 'parametros' && !porId.has('actuales')) porId.set('actuales', { id: 'actuales', ...PARAMETROS_INICIALES });
    const ids = new Set(); const codigos = new Set(); presentados[clave] = new Map();
    for (const fila of filas ?? []) {
      const error = (mensaje, campo) => errores.push({ hoja: nombre, fila: fila._fila, campo, mensaje });
      const original = fila.id ? porId.get(fila.id) : null;
      const codigo = fila.codigo;
      if (clave === 'parametros') {
        if (fila.id !== 'actuales') error('el único registro editable de parámetros es actuales', 'id');
      } else {
        if (!codigo || (clave !== 'combos' && codigo !== codigo.toUpperCase())) error('el código es obligatorio y debe estar en mayúsculas', 'Código');
        if (!fila.nombre) error('el nombre es obligatorio', 'Nombre');
        if (codigos.has(codigo)) error(`código duplicado: ${codigo}`, 'Código');
        codigos.add(codigo);
        if (!fila.id && (estado[clave] ?? []).some((registro) => (clave === 'combos' ? registro.id : registro.codigo) === codigo || registro.id === codigo)) error(`el código ${codigo} ya existe; conservá su id para actualizarlo`, 'Código');
        if (clave === 'combos' && fila.id && codigo !== fila.id) error('el código de un combo existente no puede cambiar', 'Código');
      }
      if (fila.id && !original) error(`id inexistente: ${fila.id}; para crear dejá id vacío`, 'id');
      const id = fila.id || codigo;
      if (ids.has(id)) error(`id duplicado: ${id}`, 'id');
      ids.add(id);
      if (clave === 'insumos' && !UNIDADES.has(fila.unidad)) error(`unidad desconocida: ${fila.unidad}`, 'Unidad');
      if (clave === 'productos' && !CATEGORIAS.has(fila.categoria) && fila.categoria !== original?.categoria) error(`categoría desconocida: ${fila.categoria}`, 'Categoría');
      if (clave === 'insumos' && fila.montoCompra === 0) {
        if (!original || original.montoCompra !== 0) error('insumo sin costo: requiere consulta antes de incorporarlo', 'Monto de compra ($)');
        else advertencias.push(`${nombre}, fila ${fila._fila}: ${codigo} ya tiene costo cero; se conserva sin corregirlo.`);
      }
      const editables = Object.fromEntries(CAMPOS_EXCEL[nombre].filter((campo) => !['calculado'].includes(campo.tipo) && !['id', 'heredaCodigo'].includes(campo.clave) && !(clave === 'combos' && campo.clave === 'codigo')).map((campo) => [campo.clave, fila[campo.clave]]));
      const registro = { ...(original ?? {}), ...editables, id };
      for (const campo of CAMPOS_EXCEL[nombre].filter((item) => item.tipo === 'numero')) registro[campo.clave] = conservarPrecisionExcel(registro[campo.clave], original?.[campo.clave]);
      if (clave === 'productos') { registro.extras ??= []; registro.fotos ??= []; registro.heredaCostoDe ??= null; }
      if (clave === 'combos') { registro.lineas ??= []; registro.fotos ??= []; }
      presentados[clave].set(id, { fila, registro, original });
    }
    const actuales = new Map((candidatos[clave] ?? []).map((registro) => [registro.id, registro]));
    for (const [id, { registro }] of presentados[clave]) actuales.set(id, registro);
    candidatos[clave] = [...actuales.values()];
  }
  if (!ENTIDADES_EXCEL.some(([, clave]) => (filasPorClave[clave] ?? []).length)) errores.push({ hoja: 'Archivo', fila: 1, mensaje: 'no contiene registros editables' });
  const porCodigo = (clave) => new Map(candidatos[clave].map((registro) => [clave === 'combos' ? registro.id : registro.codigo, registro]));
  const insumos = porCodigo('insumos'); const productos = porCodigo('productos');
  for (const [clave, mapa] of [['insumos', insumos], ['productos', productos]]) {
    if (mapa.size !== candidatos[clave].length) errores.push({ hoja: clave === 'insumos' ? 'Insumos' : 'Productos', fila: 1, mensaje: 'los códigos importados entran en conflicto con registros vigentes omitidos en el archivo' });
  }
  for (const { fila, registro } of presentados.productos.values()) {
    registro.heredaCostoDe = fila.heredaCodigo ? productos.get(fila.heredaCodigo)?.id : null;
    if (fila.heredaCodigo && !registro.heredaCostoDe) errores.push({ hoja: 'Productos', fila: fila._fila, campo: 'Hereda costo de (código)', mensaje: `producto inexistente: ${fila.heredaCodigo}` });
  }
  for (const [nombre, clave, lista] of [['ProductosExtras', 'productos', 'extras'], ['CombosLineas', 'combos', 'lineas']]) {
    const filas = leerFilas(libro, nombre, errores);
    if (!filas) continue; // En un archivo parcial, la hoja ausente no vacía recetas.
    for (const { registro } of presentados[clave].values()) registro[lista] = [];
    for (const fila of filas) {
      const padre = [...presentados[clave].values()].find(({ registro }) => fila.id ? registro.id === fila.id : (clave === 'combos' ? registro.id : registro.codigo) === fila.codigo);
      const error = (mensaje, campo) => errores.push({ hoja: nombre, fila: fila._fila, campo, mensaje });
      if (!padre) { error('el registro padre debe estar incluido en la hoja principal', 'Código'); continue; }
      if (fila.codigo !== (clave === 'combos' ? padre.registro.id : padre.registro.codigo)) { error('el código y el id del padre no coinciden', 'Código'); continue; }
      if (clave === 'productos') {
        const insumo = insumos.get(fila.insumoCodigo);
        if (!insumo) error(`insumo inexistente: ${fila.insumoCodigo}`, 'Código insumo');
        else {
          const anterior = padre.original?.extras?.[padre.registro.extras.length];
          padre.registro.extras.push({ ...(anterior?.insumoId === insumo.id ? anterior : {}), insumoId: insumo.id, cantidad: conservarPrecisionExcel(fila.cantidad, anterior?.insumoId === insumo.id ? anterior.cantidad : undefined) });
        }
      } else {
        if (!['PRODUCTO', 'INSUMO'].includes(fila.tipo)) { error('el tipo debe ser PRODUCTO o INSUMO', 'Tipo'); continue; }
        const componente = (fila.tipo === 'PRODUCTO' ? productos : insumos).get(fila.refCodigo);
        if (!componente) error(`componente inexistente: ${fila.refCodigo}`, 'Código componente');
        else {
          const anterior = padre.original?.lineas?.[padre.registro.lineas.length];
          padre.registro.lineas.push({ ...(anterior?.refId === componente.id && anterior?.tipo === fila.tipo ? anterior : {}), tipo: fila.tipo, refId: componente.id, cantidad: conservarPrecisionExcel(fila.cantidad, anterior?.refId === componente.id && anterior?.tipo === fila.tipo ? anterior.cantidad : undefined) });
        }
      }
    }
  }
  for (const { fila, registro } of presentados.combos.values()) {
    if (registro.lineas.length === 0 && registro.activo) errores.push({ hoja: 'Combos', fila: fila._fila, mensaje: 'un combo activo debe contener al menos un componente' });
  }
  const productosPorId = new Map(candidatos.productos.map((registro) => [registro.id, registro]));
  for (const producto of candidatos.productos) {
    const visitados = new Set(); let actual = producto;
    while (actual?.heredaCostoDe) {
      if (visitados.has(actual.id)) { errores.push({ hoja: 'Productos', fila: presentados.productos.get(producto.id)?.fila._fila ?? 1, mensaje: `ciclo de herencia en ${producto.codigo}` }); break; }
      visitados.add(actual.id); const padre = productosPorId.get(actual.heredaCostoDe);
      if (!padre) { errores.push({ hoja: 'Productos', fila: 1, mensaje: `herencia inexistente en ${producto.codigo}: ${actual.heredaCostoDe}` }); break; }
      actual = padre;
    }
    for (const extra of producto.extras ?? []) if (!candidatos.insumos.some((insumo) => insumo.id === extra.insumoId)) errores.push({ hoja: 'ProductosExtras', fila: 1, mensaje: `insumo inexistente en ${producto.codigo}: ${extra.insumoId}` });
  }
  for (const combo of candidatos.combos) for (const linea of combo.lineas ?? []) {
    if (!(linea.tipo === 'PRODUCTO' ? candidatos.productos : candidatos.insumos).some((item) => item.id === linea.refId)) errores.push({ hoja: 'CombosLineas', fila: 1, mensaje: `referencia inexistente en combo ${combo.id}: ${linea.refId}` });
  }
  const cambios = []; const resumen = { nuevos: 0, modificados: 0, sinCambios: 0 }; const cambiosPrecios = [];
  for (const [nombre, clave] of ENTIDADES_EXCEL) for (const { fila, registro, original } of presentados[clave].values()) {
    const diferencias = Object.keys(registro).filter((campo) => campo !== 'id' && !iguales(original?.[campo], registro[campo])).map((campo) => ({ campo: CAMPOS_EXCEL[nombre].find((item) => item.clave === campo)?.titulo ?? (campo === 'extras' ? 'Insumos adicionales' : campo === 'lineas' ? 'Componentes' : campo), antes: original?.[campo] ?? null, despues: registro[campo] }));
    if (original && diferencias.length === 0) resumen.sinCambios += 1;
    else {
      resumen[original ? 'modificados' : 'nuevos'] += 1;
      cambios.push({ hoja: nombre, clave, fila: fila._fila, id: registro.id, codigo: registro.codigo ?? registro.id, nombre: registro.nombre ?? 'Parámetros de cálculo', nuevo: !original, diferencias, registro });
    }
  }
  if (errores.length === 0) {
    try {
      const anterior = calcularCatalogoDesdeDatos(estado, parametrosVigentes(estado));
      const posterior = calcularCatalogoDesdeDatos(candidatos, parametrosVigentes(candidatos));
      for (const [clave, precio] of [['productos', 'precio'], ['combos', 'precioCombo']]) {
        const antes = new Map(anterior[clave].map((registro) => [registro.id, registro]));
        for (const registro of posterior[clave]) {
          const original = antes.get(registro.id);
          if (!Number.isFinite(registro[precio])) throw new Error(`el cálculo de ${registro.codigo ?? registro.id} no produce un precio válido`);
          if (registro.activo && original && registro[precio] !== original[precio]) cambiosPrecios.push({ clave, id: registro.id, codigo: registro.codigo ?? registro.id, nombre: registro.nombre, antes: original[precio], despues: registro[precio], variacion: registro[precio] - original[precio], porcentaje: original[precio] ? (registro[precio] / original[precio] - 1) * 100 : null });
        }
      }
    } catch (error) { errores.push({ hoja: 'Cálculo', fila: 1, mensaje: error.message }); }
  }
  const mayorVariacion = cambiosPrecios.reduce((mayor, cambio) => !mayor || Math.abs(cambio.variacion) > Math.abs(mayor.variacion) ? cambio : mayor, null);
  const omitidos = ENTIDADES_EXCEL.reduce((cantidad, [, clave]) => cantidad + estado[clave].filter((registro) => !presentados[clave].has(registro.id)).length, 0);
  if (HOJAS_PEDIDOS.some((nombre) => libro.hojas.some((hoja) => hoja.nombre === nombre))) advertencias.push('Las hojas de pedidos, pagos e historial son solo de consulta y no se reimportan.');
  return { version: VERSION_EXCEL, valida: errores.length === 0, errores, advertencias, resumen, cambios, cambiosPrecios, mayorVariacion, omitidos, firmaBase: firmaEstadoExcel(estado), candidatos };
}
