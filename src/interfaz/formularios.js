export function sugerirCodigoProducto(productos, categoria) {
  const prefijo = categoria === 'RECIPIENTE' ? 'R' : 'V';
  const ocupados = new Set(productos.map((item) => item.codigo));
  let numero = 1;
  while (ocupados.has(`${prefijo}${numero}`)) numero++;
  return `${prefijo}${numero}`;
}
export function filtrarPedidos(pedidos, filtro, busqueda = '') {
  const normalizar = (valor) => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim();
  const texto = normalizar(busqueda).replace(/^#/, '');
  return pedidos.filter((pedido) => {
    const enFiltro = filtro === 'TODOS' || (filtro === 'SALDO' ? pedido.saldo > 0 : filtro === 'ENTREGAR' ? pedido.estadoEntrega === 'PENDIENTE' : pedido.estadoEntrega === 'ENTREGADO' && pedido.saldo <= 0);
    return enFiltro && (!texto || normalizar(pedido.clienteNombre).includes(texto) || String(pedido.numero).includes(texto));
  });
}
