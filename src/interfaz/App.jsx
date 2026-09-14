// Armazón de la interfaz — paso 11b. Todavía no dibuja ninguna pantalla:
// cada una se construye en su propio paso de Fase 4 (ver ESTADO.md).
import { h, Fragment } from 'preact';
import { useRuta } from './enrutador.js';
import { Encabezado } from './comun/Encabezado.jsx';
import { BarraInferior } from './comun/BarraInferior.jsx';
import { Productos } from './pantallas/Productos/Productos.jsx';
import { FichaProducto } from './pantallas/FichaProducto/FichaProducto.jsx';
import { Vender } from './pantallas/Vender/Vender.jsx';
import { Pedido } from './pantallas/Pedido/Pedido.jsx';
import { Mensaje } from './pantallas/Mensaje/Mensaje.jsx';
import { RegistroPago } from './pantallas/RegistroPago/RegistroPago.jsx';
import { Pedidos } from './pantallas/Pedidos/Pedidos.jsx';
import { InsumoForm } from './pantallas/InsumoForm/InsumoForm.jsx';
import { ProductoForm } from './pantallas/ProductoForm/ProductoForm.jsx';
import { ComboForm } from './pantallas/ComboForm/ComboForm.jsx';
import { Ajustes } from './pantallas/Ajustes/Ajustes.jsx';
import { PlantillaForm } from './pantallas/PlantillaForm/PlantillaForm.jsx';
import { navegarA } from './enrutador.js';

const TITULOS = {
  vender: 'Vender',
  pedidos: 'Pedidos',
  productos: 'Productos',
  ajustes: 'Ajustes',
};

export function App() {
  const ruta = useRuta();
  const rutaPrivada = ruta === 'catalogo' ? 'vender' : ruta;
  const [rutaBase, consulta] = rutaPrivada.split('?');
  const parametrosRuta = new URLSearchParams(consulta ?? '');
  const origen = parametrosRuta.get('origen');
  const filtroOrigen = parametrosRuta.get('filtro');
  const tipoMensaje = parametrosRuta.get('tipo') ?? 'confirmacion';
  const pagoIdMensaje = parametrosRuta.get('pagoId');
  const accionIdMensaje = parametrosRuta.get('accionId');
  const esFichaProducto = rutaBase.startsWith('producto/');
  const esPedido = rutaBase.startsWith('pedido/');
  const esMensaje = rutaBase.startsWith('mensaje/');
  const esRegistroPago = rutaBase.startsWith('pago/');
  const esInsumoForm = rutaBase === 'insumo-nuevo' || rutaBase.startsWith('insumo-editar/');
  const esProductoForm = rutaBase === 'producto-nuevo' || rutaBase.startsWith('producto-editar/');
  const esComboForm = rutaBase === 'combo-nuevo' || rutaBase.startsWith('combo-editar/');
  const esPlantilla = rutaBase.startsWith('plantilla/');
  const codigoProducto = esFichaProducto ? rutaBase.split('/')[1] : null;
  const idPedido = esPedido ? rutaBase.split('/')[1] : null;
  const idMensaje = esMensaje ? rutaBase.split('/')[1] : null;
  const idRegistroPago = esRegistroPago ? rutaBase.split('/')[1] : null;
  const idInsumo = rutaBase.startsWith('insumo-editar/') ? rutaBase.split('/')[1] : null;
  const idProductoForm = rutaBase.startsWith('producto-editar/') ? rutaBase.split('/')[1] : null;
  const idComboForm = rutaBase.startsWith('combo-editar/') ? rutaBase.split('/')[1] : null;
  const idPlantilla = esPlantilla ? rutaBase.split('/')[1] : null;
  const titulo = esFichaProducto ? 'Producto' : esPedido ? 'Pedido' : esMensaje ? 'Mensaje' : esRegistroPago ? 'Registrar pago' : esInsumoForm ? 'Insumo' : esProductoForm ? 'Producto' : esComboForm ? 'Combo' : esPlantilla ? 'Plantilla' : (TITULOS[rutaBase] ?? 'Candelaria');
  const volverProductos = () => navegarA(`productos?solapa=${origen ?? (esInsumoForm ? 'insumos' : esComboForm ? 'combos' : 'productos')}`);
  const consultaOrigenPedido = `${origen ? `?origen=${encodeURIComponent(origen)}` : '?origen=pedidos'}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`;
  const volverDesdePedido = () => navegarA(origen === 'vender' ? 'vender' : `pedidos${filtroOrigen ? `?filtro=${encodeURIComponent(filtroOrigen)}` : ''}`);
  const volverAlPedido = (pedidoId) => navegarA(`pedido/${pedidoId}${consultaOrigenPedido}`);

  return (
    <>
      <Encabezado titulo={titulo} alVolver={esFichaProducto || esInsumoForm || esProductoForm || esComboForm ? volverProductos : esPedido ? volverDesdePedido : esMensaje ? () => volverAlPedido(idMensaje) : esRegistroPago ? () => volverAlPedido(idRegistroPago) : esPlantilla ? () => navegarA('ajustes') : undefined} />
      <main class="contenido">
        {rutaBase === 'productos' && <Productos />}
        {rutaBase === 'pedidos' && <Pedidos />}
        {esFichaProducto && <FichaProducto codigo={codigoProducto} />}
        {rutaBase === 'vender' && <Vender />}
        {esPedido && <Pedido id={idPedido} origen={origen ?? 'pedidos'} filtroOrigen={filtroOrigen} />}
        {esMensaje && <Mensaje id={idMensaje} tipo={tipoMensaje} pagoId={pagoIdMensaje} accionId={accionIdMensaje} />}
        {esRegistroPago && <RegistroPago id={idRegistroPago} origen={origen ?? 'pedidos'} filtroOrigen={filtroOrigen} />}
        {esInsumoForm && <InsumoForm id={idInsumo} />}
        {esProductoForm && <ProductoForm id={idProductoForm} />}
        {esComboForm && <ComboForm id={idComboForm} />}
        {rutaBase === 'ajustes' && <Ajustes />}
        {esPlantilla && <PlantillaForm id={idPlantilla} />}
      </main>
      <BarraInferior />
    </>
  );
}
