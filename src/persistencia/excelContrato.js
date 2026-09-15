// Formato versionado del intercambio. No es un respaldo ni una carga inicial.
export const VERSION_EXCEL = 1;
export const MARCA_EXCEL = 'Candelaria — intercambio Excel';

const campo = (clave, titulo, tipo = 'texto', opciones = {}) => ({ clave, titulo, tipo, ...opciones });
export const CAMPOS_EXCEL = {
  Insumos: [
    campo('id', 'id'), campo('codigo', 'Código'), campo('nombre', 'Nombre'), campo('categoria', 'Categoría'),
    campo('unidad', 'Unidad'), campo('montoCompra', 'Monto de compra ($)', 'numero'),
    campo('cantidadCompra', 'Cantidad de compra', 'numero', { positivo: true }), campo('activo', 'Activo', 'booleano'),
    campo('costoUnitario', 'Costo unitario [calculado]', 'calculado'),
  ],
  Productos: [
    campo('id', 'id'), campo('codigo', 'Código'), campo('nombre', 'Nombre'), campo('categoria', 'Categoría'),
    campo('ceraAltoPF', 'Cera alto PF (g)', 'numero'), campo('ceraBajoPF', 'Cera bajo PF (g)', 'numero'),
    campo('pabilo', 'Pabilo (unidad)', 'numero'), campo('yeso', 'Yeso (g)', 'numero'),
    campo('minutosManoObra', 'Mano de obra (min)', 'numero'), campo('recipienteCosto', 'Recipiente costo ($)', 'numero'),
    campo('recipienteCantidad', 'Recipiente cantidad', 'numero'), campo('heredaCodigo', 'Hereda costo de (código)'),
    campo('activo', 'Activo', 'booleano'), campo('materiales', 'Materiales [calculado]', 'calculado'),
    campo('manoObra', 'Mano de obra ($) [calculado]', 'calculado'), campo('subtotal', 'Subtotal [calculado]', 'calculado'),
    campo('costoProduccion', 'Costo de producción [calculado]', 'calculado'), campo('precio', 'Precio de venta [calculado]', 'calculado'),
    campo('margenSobreCosto', 'Margen sobre costo [calculado]', 'calculado'), campo('pesoManoObra', 'Peso mano de obra [calculado]', 'calculado'),
    campo('beneficioBruto', 'Beneficio bruto [calculado]', 'calculado'), campo('beneficioNeto', 'Beneficio neto [calculado]', 'calculado'),
  ],
  ProductosExtras: [campo('id', 'id producto'), campo('codigo', 'Código producto'), campo('insumoCodigo', 'Código insumo'), campo('cantidad', 'Cantidad', 'numero', { positivo: true })],
  Combos: [
    campo('id', 'id'), campo('codigo', 'Código'), campo('nombre', 'Nombre'), campo('activo', 'Activo', 'booleano'),
    campo('costoCombo', 'Costo del combo [calculado]', 'calculado'), campo('precioCombo', 'Precio de venta [calculado]', 'calculado'),
  ],
  CombosLineas: [campo('id', 'id combo'), campo('codigo', 'Código combo'), campo('tipo', 'Tipo'), campo('refCodigo', 'Código componente'), campo('cantidad', 'Cantidad', 'numero', { positivo: true })],
  Parametros: [
    campo('id', 'id'), campo('beneficio', 'Beneficio (factor)', 'numero'),
    campo('factorGastos', 'Gastos fijos y desperdicio (factor)', 'numero', { positivo: true }),
    campo('redondeo', 'Redondeo costo producción', 'numero', { positivo: true, entero: true }),
    campo('costoHoraManoObra', 'Mano de obra por hora ($)', 'numero'), campo('porcentajeEsencia', 'Esencia (%)', 'numero'),
    campo('mlColorantePorGramoCera', 'Colorante (ml por g)', 'numero'), campo('unidadesCocoPorGramoCera', 'Aceite de coco (unidad por g)', 'numero'),
  ],
};
export const ENTIDADES_EXCEL = [['Insumos', 'insumos'], ['Productos', 'productos'], ['Combos', 'combos'], ['Parametros', 'parametros']];
export const HOJAS_PEDIDOS = ['Pedidos', 'PedidosLineas', 'PedidosPagos', 'PedidosHistorial'];

export function ordenarJSON(valor) {
  if (Array.isArray(valor)) return valor.map(ordenarJSON);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.keys(valor).sort().filter((clave) => valor[clave] !== undefined).map((clave) => [clave, ordenarJSON(valor[clave])]));
  return valor;
}
export function iguales(a, b) { return JSON.stringify(ordenarJSON(a)) === JSON.stringify(ordenarJSON(b)); }
export function firmaEstadoExcel(estado) {
  return JSON.stringify(ordenarJSON(Object.fromEntries(ENTIDADES_EXCEL.map(([, clave]) => [clave, Object.fromEntries((estado[clave] ?? []).map((registro) => [registro.id, registro]))]))));
}
