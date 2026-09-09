/** @jsx h */
import { h } from 'preact';
import { useState } from 'preact/hooks';

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

export function GaleriaFotos({ fotos = [], cambiar }) {
  const [ampliada, setAmpliada] = useState(null);
  const [error, setError] = useState(null);

  async function agregar(evento) {
    const archivos = [...(evento.currentTarget.files ?? [])].slice(0, MAX_FOTOS - fotos.length);
    if (archivos.length === 0) return;
    try {
      setError(null);
      const nuevas = await Promise.all(archivos.map(leerImagen));
      cambiar([...fotos, ...nuevas].slice(0, MAX_FOTOS));
    } catch {
      setError('No se pudo leer una de las imágenes.');
    } finally {
      evento.currentTarget.value = '';
    }
  }

  return (
    <section class="galeria-fotos" aria-label="Fotos">
      <div class="galeria-fotos__encabezado">
        <div>
          <h2 class="texto-seccion">Fotos</h2>
          <p class="texto-cuerpo-s">Hasta 3 imágenes. Tocá una para ampliarla.</p>
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
              <button type="button" class="galeria-fotos__miniatura" onClick={() => setAmpliada(foto)} aria-label={`Ampliar foto ${indice + 1}`}>
                <img src={foto} alt={`Foto ${indice + 1}`} />
              </button>
              <button type="button" class="boton-texto galeria-fotos__quitar" onClick={() => cambiar(fotos.filter((_, posicion) => posicion !== indice))}>Quitar</button>
            </div>
          ))}
        </div>
      )}
      {error && <p class="aviso">{error}</p>}
      {ampliada && (
        <div class="galeria-fotos__visor" role="dialog" aria-modal="true" aria-label="Vista ampliada" onClick={() => setAmpliada(null)}>
          <button type="button" class="galeria-fotos__cerrar" onClick={() => setAmpliada(null)} aria-label="Cerrar vista ampliada">×</button>
          <img src={ampliada} alt="Vista ampliada" onClick={(evento) => evento.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
