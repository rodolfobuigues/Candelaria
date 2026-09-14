// Punto de arranque de Vite (referenciado desde index.html). No es una de
// las 4 piezas del paso 11b, pero hace falta para poder levantar App.jsx:
// monta el árbol de Preact y, solo en desarrollo, siembra las fixtures.
import { h, Fragment, render } from 'preact';
import { AuthGate } from './AuthGate.jsx';
import { AvisoActualizacionPWA, EVENTO_ACTUALIZACION_PWA } from './comun/AvisoActualizacionPWA.jsx';
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

render(<><AuthGate /><AvisoActualizacionPWA /></>, document.getElementById('app'));

async function solicitarPersistenciaLocal() {
  if (!navigator.storage?.persist || !navigator.storage?.persisted) return;
  if (!await navigator.storage.persisted()) await navigator.storage.persist();
}

solicitarPersistenciaLocal().catch((error) => console.warn('No se pudo solicitar almacenamiento persistente.', error));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    globalThis.location.reload();
  });
  navigator.serviceWorker.register('/Candelaria/sw.js').then((registro) => {
    const avisar = () => globalThis.dispatchEvent(new CustomEvent(EVENTO_ACTUALIZACION_PWA, { detail: registro }));
    if (registro.waiting) avisar();
    registro.addEventListener('updatefound', () => {
      const trabajador = registro.installing;
      trabajador?.addEventListener('statechange', () => {
        if (trabajador.state === 'installed' && navigator.serviceWorker.controller) avisar();
      });
    });
  }).catch((error) => console.error('No se pudo registrar la PWA.', error));
}
