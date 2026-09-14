/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export const EVENTO_ACTUALIZACION_PWA = 'candelaria:actualizacion-disponible';

export function AvisoActualizacionPWA() {
  const [registro, setRegistro] = useState(null);

  useEffect(() => {
    const recibir = (evento) => setRegistro(evento.detail);
    globalThis.addEventListener(EVENTO_ACTUALIZACION_PWA, recibir);
    return () => globalThis.removeEventListener(EVENTO_ACTUALIZACION_PWA, recibir);
  }, []);

  if (!registro) return null;
  function actualizar() {
    if (registro.waiting) registro.waiting.postMessage({ tipo: 'ACTIVAR_ACTUALIZACION' });
    else globalThis.location.reload();
  }

  return <aside class="pwa-actualizacion" role="status"><span>Hay una versión nueva de Candelaria.</span><button type="button" class="boton-barra" onClick={actualizar}>Actualizar ahora</button></aside>;
}
