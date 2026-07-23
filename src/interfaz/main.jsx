// Punto de arranque de Vite (referenciado desde index.html). No es una de
// las 4 piezas del paso 11b, pero hace falta para poder levantar App.jsx:
// monta el árbol de Preact y, solo en desarrollo, siembra las fixtures.
import { h, render } from 'preact';
import { App } from './App.jsx';
import '../estilos/tokens.css';
import '../estilos/componentes.css';

render(<App />, document.getElementById('app'));

// Import dinámico detrás de import.meta.env.DEV: en un build de producción
// (`vite build`, modo 'production') queda estáticamente en `false`, así que
// esta rama entera —y el chunk de siembraFixtures.js con las fixtures
// adentro— se elimina del bundle (verificado en dist/, ver ESTADO.md).
if (import.meta.env.DEV) {
  const [{ sembrarFixtures }, { abrirDB }] = await Promise.all([
    import('../desarrollo/siembraFixtures.js'),
    import('../persistencia/db.js'),
  ]);
  const db = await abrirDB();
  await sembrarFixtures(db);
}
