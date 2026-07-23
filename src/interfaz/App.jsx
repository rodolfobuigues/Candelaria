// Armazón de la interfaz — paso 11b. Todavía no dibuja ninguna pantalla:
// cada una se construye en su propio paso de Fase 4 (ver ESTADO.md).
import { h, Fragment } from 'preact';
import { useRuta } from './enrutador.js';
import { Encabezado } from './comun/Encabezado.jsx';
import { BarraInferior } from './comun/BarraInferior.jsx';

const TITULOS = {
  vender: 'Vender',
  pedidos: 'Pedidos',
  productos: 'Productos',
  ajustes: 'Ajustes',
};

export function App() {
  const ruta = useRuta();
  const titulo = TITULOS[ruta] ?? 'Candelaria';

  return (
    <>
      <Encabezado titulo={titulo} />
      <main class="contenido" />
      <BarraInferior />
    </>
  );
}
