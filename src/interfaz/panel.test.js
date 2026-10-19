import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construirProductos } from '../desarrollo/siembra.js';
import { sugerirCodigoProducto, filtrarPedidos } from './formularios.js';
import { CADUCIDAD_BORRADOR, claveBorrador, guardarBorrador, leerBorrador, borrarBorradores, purgarBorradoresCaducados } from './borradorVenta.js';
import { seccionDeRuta, decodificarSegmentoRuta, navegarA, registrarGuarda } from './enrutador.js';

class AlmacenSesion {
  datos = new Map();
  get length() { return this.datos.size; }
  key(indice) { return [...this.datos.keys()][indice] ?? null; }
  getItem(clave) { return this.datos.get(clave) ?? null; }
  setItem(clave, valor) { this.datos.set(clave, String(valor)); }
  removeItem(clave) { this.datos.delete(clave); }
}
const productos = construirProductos(readFileSync(new URL('../../fixtures_productos.csv', import.meta.url), 'utf8'));
const producto = productos.find((item) => item.codigo === 'V1');
const linea = { tipo: 'PRODUCTO', refId: producto.id, nombre: producto.nombre, codigo: producto.codigo, cantidad: 1, precioOriginal: 11400, precioAplicado: 11400 };
const borrador = { lineas: [linea], cliente: { nombre: '', telefono: '', nota: '' } };

test('borrador conserva selección al desmontar la pantalla y aísla usuarios', () => {
  const almacen = new AlmacenSesion();
  guardarBorrador(almacen, 'usuario-a', borrador, 1000);
  assert.deepEqual(leerBorrador(almacen, 'usuario-a', 1001).lineas, [linea]);
  assert.equal(leerBorrador(almacen, 'usuario-b', 1001), null);
  assert.ok(leerBorrador(almacen, 'usuario-a', 1001));
});
test('borrador vence a las ocho horas y la purga elimina físicamente la entrada', () => {
  const almacen = new AlmacenSesion();
  guardarBorrador(almacen, 'usuario-a', borrador, 1000);
  assert.ok(leerBorrador(almacen, 'usuario-a', 999 + CADUCIDAD_BORRADOR));
  purgarBorradoresCaducados(almacen, 1000 + CADUCIDAD_BORRADOR);
  assert.equal(almacen.getItem(claveBorrador('usuario-a')), null);
});
test('guardado o descarte vacía el borrador; cerrar sesión elimina sólo borradores propios', () => {
  const almacen = new AlmacenSesion();
  guardarBorrador(almacen, 'usuario-a', borrador);
  guardarBorrador(almacen, 'usuario-a', { lineas: [], cliente: { nombre: '', telefono: '', nota: '' } });
  assert.equal(almacen.length, 0);
  guardarBorrador(almacen, 'usuario-a', borrador);
  almacen.setItem('otra-aplicacion', 'conservar');
  borrarBorradores(almacen);
  assert.equal(almacen.getItem(claveBorrador('usuario-a')), null);
  assert.equal(almacen.getItem('otra-aplicacion'), 'conservar');
});
test('borrador corrupto o cantidad inválida se descarta sin bloquear la venta', () => {
  const almacen = new AlmacenSesion();
  almacen.setItem(claveBorrador('usuario-a'), '{incorrecto');
  assert.equal(leerBorrador(almacen, 'usuario-a'), null);
  guardarBorrador(almacen, 'usuario-a', { ...borrador, lineas: [{ ...linea, cantidad: -1 }] });
  assert.equal(leerBorrador(almacen, 'usuario-a'), null);
  assert.equal(almacen.length, 0);
});
test('código sugerido es libre entre todos los productos históricos, incluidos inactivos', () => {
  for (const categoria of ['VELA', 'RECIPIENTE', 'REPOSICION']) {
    const codigo = sugerirCodigoProducto(productos, categoria);
    assert.ok(!productos.some((item) => item.codigo === codigo));
    assert.ok(codigo.startsWith(categoria === 'RECIPIENTE' ? 'R' : 'V'));
  }
  assert.equal(sugerirCodigoProducto([{ codigo: 'V1', activo: false }, { codigo: 'V3' }], 'VELA'), 'V2');
});
test('búsqueda y saldo agregado mantienen separados cobro y entrega', () => {
  const pedidos = [
    { numero: 21, clienteNombre: 'María', saldo: 5000, estadoEntrega: 'ENTREGADO' },
    { numero: 22, clienteNombre: 'Maira', saldo: 0, estadoEntrega: 'PENDIENTE' },
    { numero: 23, clienteNombre: 'María', saldo: 0, estadoEntrega: 'ENTREGADO' },
  ];
  assert.deepEqual(filtrarPedidos(pedidos, 'SALDO', 'maria').map((item) => item.numero), [21]);
  assert.deepEqual(filtrarPedidos(pedidos, 'ENTREGAR', '#22').map((item) => item.numero), [22]);
  assert.deepEqual(filtrarPedidos(pedidos, 'CERRADOS', 'María').map((item) => item.numero), [23]);
  assert.equal(filtrarPedidos(pedidos, 'TODOS', 'maria').reduce((saldo, item) => saldo + item.saldo, 0), 5000);
});
test('sección activa incluye consultas y rutas de detalle', () => {
  for (const ruta of ['productos?solapa=insumos', 'producto/V1', 'combo-editar/7', 'insumo-nuevo']) assert.equal(seccionDeRuta(ruta), 'productos');
  for (const ruta of ['pedidos?filtro=SALDO', 'pedido/p1', 'pago/p1', 'mensaje/p1?origen=vender']) assert.equal(seccionDeRuta(ruta), 'pedidos');
  assert.equal(seccionDeRuta('plantilla/pago'), 'ajustes');
});
test('cancelar navegación conserva la ruta con cambios sin guardar', () => {
  const anterior = globalThis.location;
  globalThis.location = { hash: '#/producto-nuevo' };
  const quitar = registrarGuarda(() => false);
  try { assert.equal(navegarA('productos'), false); assert.equal(globalThis.location.hash, '#/producto-nuevo'); }
  finally { quitar(); }
  try { assert.equal(navegarA('productos'), true); assert.equal(globalThis.location.hash, '/productos'); }
  finally { globalThis.location = anterior; }
});

test('rutas de entidades decodifican identificadores y rechazan enlaces mal codificados', () => {
  assert.equal(decodificarSegmentoRuta('producto/V%201'), 'V 1');
  assert.equal(decodificarSegmentoRuta('insumo-editar/proveedor%2Fcera'), 'proveedor/cera');
  assert.equal(decodificarSegmentoRuta('producto/%E0%A4%A'), null);
  assert.equal(decodificarSegmentoRuta('producto-editar/'), null);
});
