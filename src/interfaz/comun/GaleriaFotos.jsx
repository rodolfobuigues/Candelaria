/** @jsx h */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const MAX_FOTOS = 3;
const MAX_LADO = 1280;

function leerImagen(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const imagen = new Image();
      imagen.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
        lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
        lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolve(lienzo.toDataURL('image/jpeg', 0.82));
      };
      imagen.onerror = reject;
      imagen.src = lector.result;
    };
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

function FotoAmpliada({ foto, nombre, cerrar }) {
  const boton = useRef(null);
  useEffect(() => {
    const anterior = document.activeElement;
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boton.current?.focus();
    function tecla(evento) {
      if (evento.key === 'Escape') cerrar();
      if (evento.key === 'Tab') { evento.preventDefault(); boton.current?.focus(); }
    }
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = desborde;
      anterior?.focus();
    };
  }, []);
  return <div class="galeria-fotos__visor" role="dialog" aria-modal="true" aria-label={`Vista ampliada de ${nombre}`} onClick={cerrar}>
    <button ref={boton} type="button" class="galeria-fotos__cerrar" onClick={cerrar} aria-label="Cerrar vista ampliada">×</button>
    <img src={foto} alt={nombre} width="1280" height="1280" onClick={(evento) => evento.stopPropagation()} />
  </div>;
}

export function GaleriaFotos({ fotos = [], cambiar, nombre = 'producto o combo', disabled = false, alProcesar = () => {} }) {
  const [ampliada, setAmpliada] = useState(null);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  async function agregar(evento) {
    const entrada = evento.currentTarget;
    const archivos = [...(entrada.files ?? [])].slice(0, MAX_FOTOS - fotos.length);
    if (archivos.length === 0) return;
    try {
      setProcesando(true); alProcesar(true);
      setError(null);
      const nuevas = await Promise.all(archivos.map(leerImagen));
      cambiar([...fotos, ...nuevas].slice(0, MAX_FOTOS));
    } catch {
      setError('No se pudo leer una de las imágenes.');
    } finally {
      entrada.value = '';
      setProcesando(false); alProcesar(false);
    }
  }

  return (
    <fieldset class="galeria-fotos formulario-sin-borde" aria-label="Fotos" disabled={disabled || procesando}>
      <div class="galeria-fotos__encabezado">
        <div>
          <h2 class="texto-seccion">Fotos</h2>
          <p class="texto-cuerpo-s">Hasta 3 imágenes. La primera es la foto principal. Tocá una para ampliarla.</p>
        </div>
        {fotos.length < MAX_FOTOS && (
          <label class="boton-secundario galeria-fotos__agregar">
            Agregar foto
            <input type="file" accept="image/*" multiple onChange={agregar} />
          </label>
        )}
      </div>
      {fotos.length > 0 && (
        <div class="galeria-fotos__miniaturas">
          {fotos.map((foto, indice) => (
            <div class="galeria-fotos__item" key={`${foto.slice(0, 24)}-${indice}`}>
              <button type="button" class="galeria-fotos__miniatura" onClick={() => setAmpliada(foto)} aria-label={`Ampliar ${nombre}, foto ${indice + 1}`}>
                <img src={foto} alt={`${nombre}, foto ${indice + 1}`} width="320" height="320" loading="lazy" />
              </button>
              <button type="button" class="boton-texto galeria-fotos__quitar" onClick={() => cambiar(fotos.filter((_, posicion) => posicion !== indice))}>Quitar</button>
              {indice > 0 && <button type="button" class="boton-texto" onClick={() => cambiar([foto, ...fotos.filter((_, posicion) => posicion !== indice)])}>Hacer principal</button>}
            </div>
          ))}
        </div>
      )}
      {procesando && <p class="texto-cuerpo-s" role="status">Preparando fotos…</p>}
      {error && <p class="aviso" role="alert">{error}</p>}
      {ampliada && <FotoAmpliada foto={ampliada} nombre={nombre} cerrar={() => setAmpliada(null)} />}
    </fieldset>
  );
}

export function VisorFotos({ fotos = [], nombre = 'producto o combo', principal = false }) {
  const [ampliada, setAmpliada] = useState(null);
  const [fallidas, setFallidas] = useState([]);
  const disponibles = fotos.filter((foto) => !fallidas.includes(foto));
  if (disponibles.length === 0) return principal ? <div class="catalogo-publico__sin-foto"><span class="titulo-m">Candelaria</span><span class="texto-cuerpo-s">{fotos.length ? 'Fotografía no disponible' : 'Fotografía pendiente'}</span></div> : null;

  return (
    <div class={`visor-fotos-catalogo${principal ? ' visor-fotos-catalogo--principal' : ''}`} aria-label={`Fotos de ${nombre}`}>
      {disponibles.map((foto, indice) => (
        <button type="button" class="visor-fotos-catalogo__miniatura" key={`${foto.slice(0, 24)}-${indice}`} onClick={() => setAmpliada(foto)} aria-label={`Ampliar ${nombre}, foto ${indice + 1}`}>
          <img src={foto} alt={`${nombre}, foto ${indice + 1}`} width="640" height="640" loading="lazy" onError={() => setFallidas((actual) => [...actual, foto])} />
        </button>
      ))}
      {ampliada && <FotoAmpliada foto={ampliada} nombre={nombre} cerrar={() => setAmpliada(null)} />}
    </div>
  );
}
