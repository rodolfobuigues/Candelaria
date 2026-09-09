// Punto de arranque de Vite (referenciado desde index.html). No es una de
// las 4 piezas del paso 11b, pero hace falta para poder levantar App.jsx:
// monta el árbol de Preact y, solo en desarrollo, siembra las fixtures.
import { h, render } from 'preact';
import { App } from './App.jsx';
import '../estilos/tokens.css';
import '../estilos/componentes.css';

// La primera apertura de la aplicación publicada carga automáticamente la
// fuente vigente del 18/08/26 si IndexedDB está completamente vacía. Luego
// no vuelve a sembrar ni sobrescribe los cambios del creador.
async function cargarFuenteInicialSiHaceFalta() {
  const [{ sembrarFixtures }, { abrirDB, obtenerTodos }, { TIENDAS }] = await Promise.all([
    import('../desarrollo/siembraFixtures.js'),
    import('../persistencia/db.js'),
    import('../persistencia/esquema.js'),
  ]);
  const db = await abrirDB();
  const [insumos, productos, combos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
  ]);
  const pedidos = await obtenerTodos(db, TIENDAS.PEDIDOS);
  const nombresFijos = new Set(insumos.map((insumo) => insumo.nombre?.trim().toLowerCase()));
  const faltanInsumosFijos = [
    ['cera alto pf'],
    ['cera bajo pf'],
    ['pabilo'],
    ['yeso'],
    ['esencia', 'escencia'],
    ['colorante'],
    ['aceite de coco'],
  ].some((candidatos) => !candidatos.some((nombre) => nombresFijos.has(nombre)));
  if (insumos.length === 0 && productos.length === 0 && combos.length === 0) {
    await sembrarFixtures(db);
  } else if (pedidos.length === 0 && faltanInsumosFijos) {
    // Recupera una inicialización anterior incompleta sin tocar una cuenta
    // que ya comenzó a registrar ventas.
    await sembrarFixtures(db);
  }
}

try {
  await cargarFuenteInicialSiHaceFalta();
} catch (error) {
  console.error('No se pudo cargar la fuente inicial de Candelaria.', error);
}

render(<App />, document.getElementById('app'));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Candelaria/sw.js');
}
