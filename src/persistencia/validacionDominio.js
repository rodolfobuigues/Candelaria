// Contrato de dominio común a formularios, JSON y persistencia.
// No completa datos ni corrige silenciosamente valores inválidos.
import { PARAMETROS_INICIALES } from '../config/parametros.js';
import { redondearPrecioVenta } from '../config/precios.js';
import { validarParametros } from '../config/validacionParametros.js';
export { validarParametros } from '../config/validacionParametros.js';

function texto(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) throw new Error(`${campo}: completá un texto válido.`);
}
function numero(valor, campo, { positivo = false, entero = false, max = Infinity } = {}) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || (positivo ? valor <= 0 : valor < 0) || valor > max || (entero && !Number.isSafeInteger(valor))) {
    throw new Error(`${campo}: debe ser ${entero ? 'un entero' : 'un número finito'} ${positivo ? 'mayor que cero' : 'mayor o igual a cero'}${max !== Infinity ? ` y menor o igual a ${max}` : ''}.`);
  }
}
function lista(valor, campo) {
  if (!Array.isArray(valor)) throw new Error(`${campo}: debe ser una lista.`);
  return valor;
}

export function validarRegistro(tienda, registro) {
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) throw new Error(`${tienda}: registro inválido.`);
  texto(registro.id, `${tienda}, identificador`);
  if (tienda === 'parametros') { validarParametros({ ...PARAMETROS_INICIALES, ...registro }); return registro; }
  texto(registro.nombre ?? registro.clienteNombre, `${tienda}, nombre`);
  if (registro.activo !== undefined && typeof registro.activo !== 'boolean') throw new Error(`${tienda}, activo: debe ser verdadero o falso.`);
  if (tienda === 'insumos' || tienda === 'productos') texto(registro.codigo, `${tienda}, código`);
  if (tienda === 'insumos') {
    if (registro.rolMotor && !['ceraAltoPF', 'ceraBajoPF', 'pabilo', 'yeso', 'esencia', 'colorante', 'aceiteCoco'].includes(registro.rolMotor)) throw new Error('Rol del insumo inválido.');
    texto(registro.unidad, 'Unidad de compra');
    numero(registro.montoCompra, 'Monto de compra');
    numero(registro.cantidadCompra, 'Cantidad de compra', { positivo: true });
  }
  if (tienda === 'productos') {
    for (const campo of ['ceraAltoPF', 'ceraBajoPF', 'pabilo', 'yeso', 'minutosManoObra', 'recipienteCosto', 'recipienteCantidad']) numero(registro[campo] ?? 0, campo);
    for (const extra of lista(registro.extras ?? [], 'Extras')) { texto(extra.insumoId, 'Insumo extra'); numero(extra.cantidad, 'Cantidad extra', { positivo: true }); }
  }
  if (tienda === 'combos' || tienda === 'pedidos') {
    for (const linea of lista(registro.lineas ?? [], 'Componentes')) {
      if (!['PRODUCTO', 'INSUMO', 'COMBO'].includes(linea.tipo) || (tienda === 'combos' && linea.tipo === 'COMBO')) throw new Error('Tipo de componente inválido.');
      texto(linea.refId, 'Referencia de componente');
      numero(linea.cantidad, 'Cantidad del componente', { positivo: true });
      if (tienda === 'pedidos') { numero(linea.precioAplicado, 'Precio aplicado'); numero(linea.precioOriginal, 'Precio original'); }
    }
  }
  if (tienda === 'pedidos') {
    numero(registro.numero, 'Número del pedido', { positivo: true, entero: true });
    if (!registro.fecha || !Number.isFinite(Date.parse(registro.fecha))) throw new Error('Fecha del pedido inválida.');
    if (!['PENDIENTE', 'ENTREGADO'].includes(registro.estadoEntrega)) throw new Error('Estado de entrega inválido.');
    numero(registro.revision ?? 0, 'Versión del pedido', { entero: true });
    let pagado = 0; const idsPagos = new Set();
    for (const pago of lista(registro.pagos ?? [], 'Pagos')) {
      texto(pago.id, 'Identificador de pago');
      if (idsPagos.has(pago.id)) throw new Error(`Pago duplicado: ${pago.id}.`);
      idsPagos.add(pago.id); numero(pago.monto, 'Monto del pago', { positivo: true });
      if (!Number.isFinite(Date.parse(pago.fecha))) throw new Error('Fecha del pago inválida.');
      if (typeof pago.anulado !== 'boolean') throw new Error('Estado del pago inválido.');
      if (!pago.anulado) pagado += pago.monto;
    }
    const bruto = (registro.lineas ?? []).reduce((suma, linea) => suma + linea.cantidad * linea.precioAplicado, 0);
    const total = Number.isFinite(bruto) ? redondearPrecioVenta(bruto) : NaN;
    if (!Number.isFinite(total) || !Number.isFinite(pagado) || pagado > total) throw new Error('Los pagos superan el total del pedido o el total no es válido.');
    lista(registro.historial ?? [], 'Historial');
  }
  if (registro.fotos !== undefined) for (const foto of lista(registro.fotos, 'Fotos')) {
    if (typeof foto !== 'string' || (!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(foto) && !/^https?:\/\//i.test(foto))) throw new Error('La foto debe ser una imagen embebida o una URL HTTP válida.');
  }
  return registro;
}

export function validarEstado(estado) {
  for (const clave of ['insumos', 'productos', 'combos', 'parametros', 'pedidos']) {
    const ids = new Set(); const codigos = new Set(); const numeros = new Set();
    for (const registro of lista(estado[clave], clave)) {
      validarRegistro(clave, registro);
      if (ids.has(registro.id)) throw new Error(`${clave}: el identificador ${registro.id} está duplicado.`);
      ids.add(registro.id);
      if (registro.codigo && codigos.has(registro.codigo)) throw new Error(`${clave}: el código ${registro.codigo} está duplicado.`);
      if (registro.codigo) codigos.add(registro.codigo);
      if (clave === 'pedidos' && numeros.has(registro.numero)) throw new Error(`Número de pedido duplicado: ${registro.numero}.`);
      numeros.add(registro.numero);
    }
  }
  const productos = new Map(estado.productos.map((registro) => [registro.id, registro]));
  const insumos = new Set(estado.insumos.map((registro) => registro.id));
  const roles = new Set();
  for (const insumo of estado.insumos) if (insumo.rolMotor) {
    if (roles.has(insumo.rolMotor)) throw new Error(`Rol de insumo duplicado: ${insumo.rolMotor}.`);
    roles.add(insumo.rolMotor);
  }
  for (const producto of estado.productos) {
    for (const extra of producto.extras ?? []) if (!insumos.has(extra.insumoId)) throw new Error(`Producto ${producto.codigo}: falta el insumo extra ${extra.insumoId}.`);
    const vistos = new Set([producto.id]); let id = producto.heredaCostoDe;
    while (id) {
      if (!productos.has(id)) throw new Error(`Producto ${producto.codigo}: falta el producto heredado ${id}.`);
      if (vistos.has(id)) throw new Error(`Producto ${producto.codigo}: la herencia de costo es circular.`);
      vistos.add(id); id = productos.get(id).heredaCostoDe;
    }
  }
  for (const combo of estado.combos) for (const linea of combo.lineas ?? []) {
    if (!(linea.tipo === 'PRODUCTO' ? productos.has(linea.refId) : insumos.has(linea.refId))) throw new Error(`Combo ${combo.id}: falta el componente ${linea.refId}.`);
  }
  // Los pedidos conservan referencias históricas; no requieren productos activos.
  return estado;
}
