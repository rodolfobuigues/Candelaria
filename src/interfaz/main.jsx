// Punto de arranque de Vite (referenciado desde index.html). No es una de
// las 4 piezas del paso 11b, pero hace falta para poder levantar App.jsx:
// monta el árbol de Preact y, solo en desarrollo, siembra las fixtures.
import { h, render } from 'preact';
import { AuthGate } from './AuthGate.jsx';
import { cargarFuenteInicialSiHaceFalta } from '../desarrollo/inicializacion.js';
import { supabaseConfigurado } from '../config/supabase.js';
import '../estilos/tokens.css';
import '../estilos/componentes.css';

if (!supabaseConfigurado) {
  try {
    await cargarFuenteInicialSiHaceFalta();
  } catch (error) {
    console.error('No se pudo cargar la fuente inicial de Candelaria.', error);
  }
}

render(<AuthGate />, document.getElementById('app'));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Candelaria/sw.js');
}
