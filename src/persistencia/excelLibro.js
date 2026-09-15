// Build de navegador de ExcelJS: no requiere fs ni un CDN en producción.
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { CAMPOS_EXCEL, MARCA_EXCEL, VERSION_EXCEL } from './excelContrato.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';
import { calcularCatalogoDesdeDatos } from './catalogoRepo.js';
import { calcularIndicadores } from '../motor/calculo.js';

export const MIME_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const LIMITE_ARCHIVO = 20 * 1024 * 1024;
const moneda = '"$"#,##0.00';
const decimal = '#,##0.########';

function crearHoja(libro, nombre, campos, registros, soloLectura = false) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1, xSplit: 2, showGridLines: false }] });
  hoja.columns = campos.map((campo) => ({ header: campo.titulo, key: campo.clave, width: campo.clave === 'texto' ? 70 : ['descripcion', 'notaInterna', 'motivoInvalidacion', 'motivoAnulacion'].includes(campo.clave) ? 48 : campo.clave === 'detalle' ? 90 : campo.clave === 'nombre' || campo.clave.startsWith('cliente') ? 32 : campo.titulo.length > 25 ? 26 : 20 }));
  hoja.addRows(registros.map((registro) => Object.fromEntries(campos.map((campo) => [campo.clave, campo.tipo === 'booleano' ? (registro[campo.clave] ? 'Sí' : 'No') : typeof registro[campo.clave] === 'number' && !Number.isFinite(registro[campo.clave]) ? null : registro[campo.clave] ?? null]))));
  hoja.getRow(1).height = 36;
  hoja.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { theme: 0 } };
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 1 } };
  hoja.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(hoja.rowCount, 1), column: campos.length } };
  for (let fila = 2; fila <= hoja.rowCount; fila += 1) {
    hoja.getRow(fila).font = { name: 'Arial', size: 11 };
    hoja.getRow(fila).height = 24;
    campos.forEach((campo, indice) => {
      const celda = hoja.getCell(fila, indice + 1);
      const envolver = ['texto', 'descripcion', 'notaInterna', 'motivoInvalidacion', 'motivoAnulacion', 'nombre', 'nombreCongelado'].includes(campo.clave);
      celda.alignment = { vertical: 'middle', horizontal: ['numero', 'calculado', 'fecha'].includes(campo.tipo) ? 'right' : 'left', wrapText: envolver };
      if (envolver) {
        const lineas = String(celda.value ?? '').split('\n').reduce((total, linea) => total + Math.max(1, Math.ceil(linea.length / (hoja.getColumn(indice + 1).width - 3))), 0);
        hoja.getRow(fila).height = Math.min(409, Math.max(hoja.getRow(fila).height, lineas * 16 + 8));
      }
      if (campo.tipo === 'fecha') celda.numFmt = 'dd/mm/yyyy hh:mm';
      else if (campo.titulo.includes('Margen') || campo.titulo.includes('Peso mano')) celda.numFmt = '0.0%';
      else if (campo.tipo === 'numero' || campo.tipo === 'calculado') celda.numFmt = campo.titulo.includes('($)') || campo.tipo === 'calculado' ? moneda : decimal;
      else celda.numFmt = '@';
      if (campo.clave === 'id' || campo.tipo === 'calculado' || soloLectura) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 1, tint: 0.9 } };
      if (campo.tipo === 'booleano' && !soloLectura) celda.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Sí,No"'] };
    });
  }
  return hoja;
}

function readonly(clave, titulo, tipo = 'texto') { return { clave, titulo, tipo }; }
function fecha(valor) { return valor ? new Date(valor) : null; }

export function crearLibroExcel(estado, { fuente = 'Supabase', exportadoEn = new Date() } = {}) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Candelaria'; libro.created = exportadoEn;
  const parametros = { ...PARAMETROS_INICIALES, ...(estado.parametros.find((registro) => registro.id === 'actuales') ?? {}) };
  const calculados = calcularCatalogoDesdeDatos(estado, parametros);
  const insumosPorId = new Map(estado.insumos.map((insumo) => [insumo.id, insumo]));
  const productosPorId = new Map(estado.productos.map((producto) => [producto.id, producto]));
  crearHoja(libro, 'Insumos', CAMPOS_EXCEL.Insumos, estado.insumos.map((insumo) => ({ ...insumo, costoUnitario: insumo.montoCompra / insumo.cantidadCompra })));
  crearHoja(libro, 'Productos', CAMPOS_EXCEL.Productos, calculados.productos.map((producto) => ({ ...producto, ...calcularIndicadores(producto), heredaCodigo: productosPorId.get(producto.heredaCostoDe)?.codigo ?? '' })));
  crearHoja(libro, 'ProductosExtras', CAMPOS_EXCEL.ProductosExtras, estado.productos.flatMap((producto) => (producto.extras ?? []).map((extra) => ({ id: producto.id, codigo: producto.codigo, insumoCodigo: insumosPorId.get(extra.insumoId)?.codigo ?? extra.insumoId, cantidad: extra.cantidad }))));
  crearHoja(libro, 'Combos', CAMPOS_EXCEL.Combos, calculados.combos.map((combo) => ({ ...combo, codigo: combo.id })));
  crearHoja(libro, 'CombosLineas', CAMPOS_EXCEL.CombosLineas, estado.combos.flatMap((combo) => (combo.lineas ?? []).map((linea) => ({ id: combo.id, codigo: combo.id, tipo: linea.tipo, refCodigo: (linea.tipo === 'PRODUCTO' ? productosPorId : insumosPorId).get(linea.refId)?.codigo ?? linea.refId, cantidad: linea.cantidad }))));
  crearHoja(libro, 'Parametros', CAMPOS_EXCEL.Parametros, [{ ...parametros, id: 'actuales' }]);
  const pedidos = estado.pedidos ?? [];
  crearHoja(libro, 'Pedidos', [readonly('id', 'id'), readonly('numero', 'Número pedido', 'numero'), readonly('fecha', 'Fecha', 'fecha'), readonly('clienteNombre', 'Cliente'), readonly('clienteTelefono', 'Teléfono'), readonly('notaInterna', 'Nota interna'), readonly('estadoEntrega', 'Entrega'), readonly('estadoCobro', 'Cobro'), readonly('total', 'Total ($)', 'numero'), readonly('pagado', 'Pagado ($)', 'numero'), readonly('saldo', 'Saldo ($)', 'numero')], pedidos.map((pedido) => ({ ...pedido, fecha: fecha(pedido.fecha) })), true);
  crearHoja(libro, 'PedidosLineas', [readonly('id', 'id pedido'), readonly('numero', 'Número pedido', 'numero'), readonly('tipo', 'Tipo'), readonly('refId', 'Código referencia'), readonly('nombreCongelado', 'Nombre al tomar pedido'), readonly('precioOriginal', 'Precio original ($)', 'numero'), readonly('precioAplicado', 'Precio aplicado ($)', 'numero'), readonly('cantidad', 'Cantidad', 'numero')], pedidos.flatMap((pedido) => pedido.lineas.map((linea) => ({ ...linea, id: pedido.id, numero: pedido.numero }))), true);
  crearHoja(libro, 'PedidosPagos', [readonly('id', 'id pago'), readonly('pedidoId', 'id pedido'), readonly('numero', 'Número pedido', 'numero'), readonly('fecha', 'Fecha', 'fecha'), readonly('monto', 'Monto ($)', 'numero'), readonly('medio', 'Medio'), readonly('nota', 'Nota'), readonly('anulado', 'Anulado', 'booleano'), readonly('motivoAnulacion', 'Motivo anulación'), readonly('fechaAnulacion', 'Fecha anulación', 'fecha')], pedidos.flatMap((pedido) => pedido.pagos.map((pago) => ({ ...pago, pedidoId: pedido.id, numero: pedido.numero, fecha: fecha(pago.fecha), fechaAnulacion: fecha(pago.fechaAnulacion) }))), true);
  crearHoja(libro, 'PedidosHistorial', [readonly('id', 'id pedido'), readonly('numero', 'Número pedido', 'numero'), readonly('fecha', 'Fecha', 'fecha'), readonly('tipo', 'Tipo'), readonly('descripcion', 'Descripción'), readonly('texto', 'Mensaje generado'), readonly('vigente', 'Mensaje vigente', 'booleano'), readonly('motivoInvalidacion', 'Motivo invalidación'), readonly('detalle', 'Detalle completo (solo consulta)')], pedidos.flatMap((pedido) => pedido.historial.map((evento) => ({ ...evento, id: pedido.id, numero: pedido.numero, fecha: fecha(evento.fecha), vigente: evento.vigente !== false, detalle: JSON.stringify(evento) }))), true);
  const instrucciones = libro.addWorksheet('Instrucciones', { views: [{ showGridLines: false }] });
  instrucciones.columns = [{ width: 36 }, { width: 110 }];
  instrucciones.addRows([
    [MARCA_EXCEL], ['Versión del formato', VERSION_EXCEL], ['Fuente vigente', fuente], ['Exportado el', exportadoEn],
    ['Uso', 'Editá datos de Insumos, Productos, Combos y Parametros. Las columnas [calculado] son valores de referencia: se ignoran al importar y se recalculan en la aplicación.'],
    ['Actualizar', 'Conservá el id del registro. Para un alta, dejá id vacío y usá un código nuevo. Los códigos deben ser únicos y estar en mayúsculas.'],
    ['Recetas y componentes', 'ProductosExtras y CombosLineas permiten editar las cantidades. Incluí también sus padres en Productos o Combos. Los códigos de referencia deben existir en el catálogo o crearse en este mismo archivo.'],
    ['Archivo parcial', 'Los registros que no figuran en las hojas principales no se modifican ni se borran. Una hoja de extras o líneas ausente conserva las listas actuales. Si la hoja está presente, reemplaza las listas de los padres incluidos: quitar una línea elimina ese componente, previa revisión.'],
    ['Fotos y pedidos', 'Las fotos y los datos fuera del intercambio se conservan. Pedidos, líneas, pagos y mensajes históricos se exportan solo para consulta y nunca se reimportan. El respaldo completo sigue siendo JSON.'],
    ['Antes de aplicar', 'Revisá los cambios y su impacto en los precios. Debés confirmar y guardar el respaldo JSON previo descargado. Si cambió el catálogo desde la revisión, la importación se rechaza y hay que revisarla nuevamente.'],
    ['Números y fórmulas', 'Usá celdas numéricas, no textos con separadores de miles ni fórmulas en columnas editables. Las cantidades deben ser no negativas; las cantidades de compra y componentes, mayores a cero. No se corrigen automáticamente insumos sin costo.'],
    ['Protección', 'La planilla histórica original no se reimporta con este mecanismo. Solo se admite el formato de intercambio exportado por Candelaria.'],
  ]);
  instrucciones.eachRow((fila) => { fila.font = { name: 'Arial', size: 11 }; fila.alignment = { wrapText: true, vertical: 'middle' }; fila.height = 48; });
  instrucciones.getRow(1).font = { name: 'Arial', size: 14, bold: true };
  instrucciones.getCell('B4').numFmt = 'dd/mm/yyyy hh:mm';
  return libro;
}

export async function escribirExcel(estado, opciones) {
  return new Uint8Array(await crearLibroExcel(estado, opciones).xlsx.writeBuffer());
}

export async function leerExcelIntercambio(archivo) {
  if (archivo.size > LIMITE_ARCHIVO) throw new Error('El archivo supera el límite de 20 MB.');
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await archivo.arrayBuffer());
  const hojas = libro.worksheets.map((hoja) => {
    if (hoja.rowCount > 10000 || hoja.columnCount > 80) throw new Error(`La hoja ${hoja.name} supera el límite de 10.000 filas u 80 columnas.`);
    const filas = Array.from({ length: hoja.rowCount }, (_, indice) => hoja.getRow(indice + 1).values.slice(1));
    return { nombre: hoja.name, filas };
  });
  return { hojas };
}
