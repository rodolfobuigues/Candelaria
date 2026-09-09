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
  const esFichaProducto = ruta.startsWith('producto/');
  const esPedido = ruta.startsWith('pedido/');
  const esMensaje = ruta.startsWith('mensaje/');
  const esRegistroPago = ruta.startsWith('pago/');
  const esInsumoForm = ruta === 'insumo-nuevo' || ruta.startsWith('insumo-editar/');
  const esProductoForm = ruta === 'producto-nuevo' || ruta.startsWith('producto-editar/');
  const esComboForm = ruta === 'combo-nuevo' || ruta.startsWith('combo-editar/');
  const esPlantilla = ruta.startsWith('plantilla/');
  const codigoProducto = esFichaProducto ? ruta.split('/')[1] : null;
  const idPedido = esPedido ? ruta.split('/')[1] : null;
  const idMensaje = esMensaje ? ruta.split('/')[1] : null;
  const idRegistroPago = esRegistroPago ? ruta.split('/')[1] : null;
  const idInsumo = ruta.startsWith('insumo-editar/') ? ruta.split('/')[1] : null;
  const idProductoForm = ruta.startsWith('producto-editar/') ? ruta.split('/')[1] : null;
  const idComboForm = ruta.startsWith('combo-editar/') ? ruta.split('/')[1] : null;
  const idPlantilla = esPlantilla ? ruta.split('/')[1] : null;
  const titulo = esFichaProducto ? 'Producto' : esPedido ? 'Pedido' : esMensaje ? 'Mensaje' : esRegistroPago ? 'Registrar pago' : esInsumoForm ? 'Insumo' : esProductoForm ? 'Producto' : esComboForm ? 'Combo' : esPlantilla ? 'Plantilla' : (TITULOS[ruta] ?? 'Candelaria');

  return (
    <>
      <Encabezado titulo={titulo} alVolver={esFichaProducto || esInsumoForm || esProductoForm || esComboForm ? () => navegarA('productos') : esPedido ? () => navegarA('vender') : esMensaje ? () => navegarA(`pedido/${idMensaje}`) : esRegistroPago ? () => navegarA(`pedido/${idRegistroPago}`) : esPlantilla ? () => navegarA('ajustes') : undefined} />
      <main class="contenido">
        {ruta === 'productos' && <Productos />}
        {ruta === 'pedidos' && <Pedidos />}
        {esFichaProducto && <FichaProducto codigo={codigoProducto} />}
        {ruta === 'vender' && <Vender />}
        {esPedido && <Pedido id={idPedido} />}
        {esMensaje && <Mensaje id={idMensaje} />}
        {esRegistroPago && <RegistroPago id={idRegistroPago} />}
        {esInsumoForm && <InsumoForm id={idInsumo} />}
        {esProductoForm && <ProductoForm id={idProductoForm} />}
        {esComboForm && <ComboForm id={idComboForm} />}
        {ruta === 'ajustes' && <Ajustes />}
        {esPlantilla && <PlantillaForm id={idPlantilla} />}
      </main>
      <BarraInferior />
    </>
  );
}
