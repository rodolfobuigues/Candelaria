/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatearImporte } from '../../../config/formato.js';
import { obtenerCatalogoPublico } from '../../../persistencia/catalogoPublicoRepo.js';
import { navegarA } from '../../enrutador.js';
import { VisorFotos } from '../../comun/GaleriaFotos.jsx';

function normalizar(texto) {
  return String(texto ?? '').trim().toLocaleLowerCase('es-AR');
}

export function CatalogoPublico() {
  const [combos, setCombos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerCatalogoPublico()
      .then((resultado) => activo && setCombos(resultado))
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, []);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    return (combos ?? []).filter((combo) => !texto || normalizar(`${combo.nombre} ${combo.descripcion}`).includes(texto));
  }, [combos, busqueda]);

  return <main class="catalogo-publico">
    <header class="catalogo-publico__encabezado">
      <div><span class="etiqueta">Velas aromáticas</span><h1 class="titulo-l">Candelaria</h1></div>
      <button type="button" class="boton-secundario catalogo-publico__ingresar" onClick={() => navegarA('ingresar')}>Ingresar</button>
    </header>
    <section class="catalogo-publico__presentacion"><h2 class="titulo-m">Combos</h2><p class="texto-cuerpo-s">Consultá nuestros combos disponibles y sus precios.</p></section>
    <label class="campo-entrada"><span>Buscar combo</span><input type="search" value={busqueda} onInput={(e) => setBusqueda(e.currentTarget.value)} placeholder="Nombre o contenido" /></label>
    {error && <p class="aviso">No se pudo cargar el catálogo: {error}</p>}
    {!combos && !error && <p class="texto-cuerpo-s">Cargando catálogo…</p>}
    {combos && visibles.length === 0 && <p class="texto-cuerpo-s lista-vacia">No encontramos combos con esa búsqueda.</p>}
    {visibles.length > 0 && <ul class="catalogo-publico__lista">{visibles.map((combo) => <li class="tarjeta catalogo-publico__combo" key={combo.id}><div class="catalogo-publico__datos"><span class="etiqueta">Combo {combo.id}</span><h2 class="texto-seccion">{combo.nombre}</h2>{combo.descripcion && <p class="texto-cuerpo-s">{combo.descripcion}</p>}<strong class="importe-l">{formatearImporte(combo.precio)}</strong></div><VisorFotos fotos={combo.fotos} /></li>)}</ul>}
  </main>;
}
