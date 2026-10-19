// Armazón privado: navegación, encabezado y pantallas del panel.
import { h, Fragment } from 'preact';
import { useEffect } from 'preact/hooks';
import { purgarBorradoresCaducados } from './borradorVenta.js';
import { useRuta, decodificarSegmentoRuta, seccionDeRuta } from './enrutador.js';
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

export function App({ usuarioId = 'local' }) {
  const ruta = useRuta();
  useEffect(() => { const purgar = () => { try { purgarBorradoresCaducados(globalThis.sessionStorage); } catch {} }; purgar(); const reloj = setInterval(purgar, 60000); return () => clearInterval(reloj); }, []);
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
  const codigoProducto = esFichaProducto ? decodificarSegmentoRuta(rutaBase) : null;
  const idPedido = esPedido ? decodificarSegmentoRuta(rutaBase) : null;
  const idMensaje = esMensaje ? decodificarSegmentoRuta(rutaBase) : null;
  const idRegistroPago = esRegistroPago ? decodificarSegmentoRuta(rutaBase) : null;
  const idInsumo = rutaBase.startsWith('insumo-editar/') ? decodificarSegmentoRuta(rutaBase) : null;
  const idProductoForm = rutaBase.startsWith('producto-editar/') ? decodificarSegmentoRuta(rutaBase) : null;
  const idComboForm = rutaBase.startsWith('combo-editar/') ? decodificarSegmentoRuta(rutaBase) : null;
  const idPlantilla = esPlantilla ? decodificarSegmentoRuta(rutaBase) : null;
  const esFormulario = esInsumoForm || esProductoForm || esComboForm || esPlantilla || esRegistroPago;
  const titulo = esFichaProducto ? 'Producto' : esPedido ? 'Pedido' : esMensaje ? 'Mensaje' : esRegistroPago ? 'Registrar pago' : esInsumoForm ? 'Insumo' : esProductoForm ? 'Producto' : esComboForm ? 'Combo' : esPlantilla ? 'Plantilla' : (TITULOS[rutaBase] ?? 'Candelaria');
  const volverProductos = () => navegarA(`productos?solapa=${origen ?? (esInsumoForm ? 'insumos' : esComboForm ? 'combos' : 'productos')}`);
  const consultaOrigenPedido = `${origen ? `?origen=${encodeURIComponent(origen)}` : '?origen=pedidos'}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`;
  const volverDesdePedido = () => navegarA(origen === 'vender' ? 'vender' : `pedidos${filtroOrigen ? `?filtro=${encodeURIComponent(filtroOrigen)}` : ''}`);
  const volverAlPedido = (pedidoId) => navegarA(`pedido/${encodeURIComponent(pedidoId)}${consultaOrigenPedido}`);

  const requiereId = esFichaProducto || esPedido || esMensaje || esRegistroPago || esPlantilla || /^(insumo|producto|combo)-editar\//.test(rutaBase);
  if (requiereId && !decodificarSegmentoRuta(rutaBase)) return <><Encabezado titulo="Enlace inválido" alVolver={() => navegarA(seccionDeRuta(rutaBase))} /><main class="contenido"><p class="aviso" role="alert">El enlace contiene un identificador inválido. Volvé a la lista y abrí el registro desde allí.</p><button type="button" class="boton-secundario" onClick={() => navegarA(seccionDeRuta(rutaBase))}>Volver a la lista</button></main></>;

  return (
    <>
      <Encabezado titulo={titulo} alCerrar={esFormulario ? (esRegistroPago ? () => volverAlPedido(idRegistroPago) : esPlantilla ? () => navegarA('ajustes') : volverProductos) : undefined} alVolver={!esFormulario ? (esFichaProducto || esInsumoForm || esProductoForm || esComboForm ? volverProductos : esPedido ? volverDesdePedido : esMensaje ? () => volverAlPedido(idMensaje) : esRegistroPago ? () => volverAlPedido(idRegistroPago) : esPlantilla ? () => navegarA('ajustes') : undefined) : undefined} />
      <main class={`contenido${esFormulario ? ' contenido--formulario' : ''}`}>
        {rutaBase === 'productos' && <Productos />}
        {rutaBase === 'pedidos' && <Pedidos />}
        {esFichaProducto && <FichaProducto codigo={codigoProducto} />}
        {rutaBase === 'vender' && <Vender usuarioId={usuarioId} />}
        {esPedido && <Pedido key={idPedido ?? 'nuevo'} id={idPedido} origen={origen ?? 'pedidos'} filtroOrigen={filtroOrigen} />}
        {esMensaje && <Mensaje id={idMensaje} tipo={tipoMensaje} pagoId={pagoIdMensaje} accionId={accionIdMensaje} />}
        {esRegistroPago && <RegistroPago key={idRegistroPago ?? 'nuevo'} id={idRegistroPago} origen={origen ?? 'pedidos'} filtroOrigen={filtroOrigen} />}
        {esInsumoForm && <InsumoForm key={idInsumo ?? 'nuevo'} id={idInsumo} />}
        {esProductoForm && <ProductoForm key={idProductoForm ?? 'nuevo'} id={idProductoForm} />}
        {esComboForm && <ComboForm key={idComboForm ?? 'nuevo'} id={idComboForm} />}
        {rutaBase === 'ajustes' && <Ajustes />}
        {esPlantilla && <PlantillaForm key={idPlantilla ?? 'nuevo'} id={idPlantilla} />}
      </main>
      {!esFormulario && <BarraInferior />}
    </>
  );
}
