/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatearImporte } from '../../../config/formato.js';
import { normalizarBusqueda, obtenerCatalogoPublico, telefonoComercialPublico } from '../../../persistencia/catalogoPublicoRepo.js';
import { navegarA } from '../../enrutador.js';
import { VisorFotos } from '../../comun/GaleriaFotos.jsx';

export function consultaCombo(combo) {
  return `Hola, quiero consultar por el combo ${combo.id}: ${combo.nombre}, ${formatearImporte(combo.precio)}. ¿Podés contarme cómo pedirlo?`;
}

export function TarjetaCatalogo({ combo, vistaPrevia = false }) {
  const [consulta, setConsulta] = useState('');
  const [estado, setEstado] = useState('');
  const telefono = telefonoComercialPublico(combo.telefono_comercial);
  async function copiar(texto, mensaje) {
    setEstado('');
    try { await navigator.clipboard.writeText(texto); setEstado(mensaje); }
    catch { setConsulta(texto); setEstado('Seleccioná y copiá el texto.'); }
  }
  return <article class="tarjeta catalogo-publico__combo" id={`combo-${combo.id}`}>
    <VisorFotos fotos={combo.fotos} nombre={combo.nombre} principal />
    <div class="catalogo-publico__datos"><span class="etiqueta">Combo {combo.id}</span><h2 class="titulo-m">{combo.nombre}</h2>
      {combo.descripcion ? <p class="texto-cuerpo-s">{combo.descripcion}</p> : <p class="texto-cuerpo-s">Consultá el contenido de este combo.</p>}
      <strong class="importe-l">{formatearImporte(combo.precio)}</strong>
    </div>
    {telefono ? <a class="boton-primario" href={`https://wa.me/${telefono}?text=${encodeURIComponent(consultaCombo(combo))}`} target="_blank" rel="noopener noreferrer">Consultar este combo</a>
      : <button type="button" class="boton-primario" onClick={() => copiar(consultaCombo(combo), 'Consulta copiada. Compartila con Candelaria.')}>Copiar consulta</button>}
    {!vistaPrevia && <button type="button" class="boton-texto" onClick={() => copiar(`${location.href.split('#')[0]}#/catalogo?combo=${encodeURIComponent(combo.id)}`, 'Enlace copiado.')}>Copiar enlace del combo</button>}
    {consulta && <label class="campo-entrada"><span>Texto para copiar</span><textarea readOnly value={consulta} onFocus={(e) => e.currentTarget.select()} /></label>}
    {estado && <p class="texto-cuerpo-s" role="status">{estado}</p>}
  </article>;
}

export function CatalogoPublico({ cargar = obtenerCatalogoPublico }) {
  const [combos, setCombos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('codigo');
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState(() => new URLSearchParams(location.hash.split('?')[1]).get('combo'));
  useEffect(() => {
    function cambiar() { setSeleccion(new URLSearchParams(location.hash.split('?')[1]).get('combo')); }
    addEventListener('hashchange', cambiar);
    return () => removeEventListener('hashchange', cambiar);
  }, []);
  useEffect(() => {
    let activo = true;
    cargar().then((resultado) => activo && setCombos(resultado)).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [cargar]);
  const visibles = useMemo(() => {
    const texto = normalizarBusqueda(busqueda);
    return (combos ?? []).filter((combo) => (!seleccion || combo.id === seleccion) && (!texto || normalizarBusqueda(`${combo.nombre} ${combo.descripcion} ${combo.id}`).includes(texto)))
      .sort((a, b) => orden === 'menor' ? a.precio - b.precio : orden === 'mayor' ? b.precio - a.precio : a.id.localeCompare(b.id, 'es-AR', { numeric: true }));
  }, [combos, busqueda, orden, seleccion]);
  return <main class="catalogo-publico">
    <header class="catalogo-publico__encabezado"><div><span class="etiqueta">Velas aromáticas</span><h1 class="titulo-display">Candelaria</h1></div><button type="button" class="boton-texto catalogo-publico__ingresar" onClick={() => navegarA('ingresar')}>Administrar</button></header>
    <section class="catalogo-publico__presentacion"><h2 class="titulo-l">Elegí tu próximo combo</h2><p class="texto-cuerpo-s">Explorá las fotos y el contenido. Consultanos por el combo que te guste.</p></section>
    <div class="catalogo-publico__filtros"><label class="campo-entrada"><span>Buscar combo</span><input type="search" value={busqueda} onInput={(e) => setBusqueda(e.currentTarget.value)} placeholder="Nombre, código o contenido" /></label><label class="campo-entrada"><span>Ordenar</span><select value={orden} onChange={(e) => setOrden(e.currentTarget.value)}><option value="codigo">Código del combo</option><option value="menor">Menor precio</option><option value="mayor">Mayor precio</option></select></label></div>
    {seleccion && <button type="button" class="boton-secundario" onClick={() => { setBusqueda(''); navegarA('catalogo'); }}>Ver todos los combos</button>}
    {error && <p class="aviso">No se pudo cargar el catálogo: {error}</p>}
    {!combos && !error && <p class="texto-cuerpo-s" role="status">Cargando catálogo…</p>}
    {combos && <p class="texto-cuerpo-s" role="status">{visibles.length} {visibles.length === 1 ? 'combo disponible' : 'combos disponibles'}</p>}
    {combos && visibles.length === 0 && <p class="texto-cuerpo-s lista-vacia">No encontramos combos con esa búsqueda.</p>}
    {visibles.length > 0 && <ul class="catalogo-publico__lista">{visibles.map((combo) => <li key={combo.id}><TarjetaCatalogo combo={combo} /></li>)}</ul>}
    <footer class="texto-cuerpo-s catalogo-publico__pie">Los precios corresponden al catálogo vigente. Confirmá los detalles al consultar.</footer>
  </main>;
}
