// Enrutador propio por hash — CLAUDE.md / ESPECIFICACION.md § 2: "Enrutado
// por hash, escrito a mano sobre hashchange. Sin librería de enrutado y sin
// History API: GitHub Pages no tiene fallback de SPA."
import { useState, useEffect } from 'preact/hooks';

const RUTA_INICIAL = 'vender';

function leerRutaDelHash() {
  const hash = globalThis.location.hash.replace(/^#\/?/, '');
  return hash || RUTA_INICIAL;
}

export function navegarA(ruta) {
  globalThis.location.hash = `/${ruta}`;
}

// Se suscribe a hashchange; no usa History API. Cualquier componente puede
// llamarlo — no hace falta pasar la ruta actual por props desde App.jsx.
export function useRuta() {
  const [ruta, setRuta] = useState(leerRutaDelHash());

  useEffect(() => {
    const alCambiarHash = () => setRuta(leerRutaDelHash());
    globalThis.addEventListener('hashchange', alCambiarHash);
    return () => globalThis.removeEventListener('hashchange', alCambiarHash);
  }, []);

  return ruta;
}
