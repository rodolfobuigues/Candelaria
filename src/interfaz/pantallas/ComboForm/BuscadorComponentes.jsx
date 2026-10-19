/** @jsx h */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { normalizarBusqueda } from '../../../persistencia/catalogoPublicoRepo.js';

const LIMITE_SUGERENCIAS = 6;

export function BuscadorComponentes({ opciones, alElegir, reemplazando = null, alCancelar }) {
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState('');
  const entrada = useRef(null);
  const resultados = useRef(null);
  const texto = normalizarBusqueda(busqueda);
  const palabras = texto.split(/\s+/).filter(Boolean);
  function prioridad(opcion) {
    const codigo = normalizarBusqueda(opcion.codigo);
    const nombre = normalizarBusqueda(opcion.nombre);
    return codigo === texto || nombre === texto ? 0 : codigo.startsWith(texto) || nombre.startsWith(texto) ? 1 : 2;
  }
  const coincidencias = palabras.length ? opciones
    .filter((opcion) => palabras.every((palabra) => normalizarBusqueda(opcion.etiqueta).includes(palabra)))
    .sort((a, b) => prioridad(a) - prioridad(b)) : [];
  const visibles = coincidencias.slice(0, LIMITE_SUGERENCIAS);

  useEffect(() => {
    setBusqueda('');
    if (reemplazando !== null) {
      setAviso('');
      entrada.current?.focus();
      entrada.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [reemplazando]);

  function elegir(opcion) {
    alElegir(opcion);
    setBusqueda('');
    setAviso(reemplazando !== null ? `Componente cambiado por ${opcion.nombre}. Se conservó la cantidad.` : `${opcion.nombre} agregado con cantidad 1. Podés editarla en la lista.`);
    entrada.current?.focus();
  }

  function tecladoResultado(evento) {
    const botones = [...resultados.current.querySelectorAll('button')];
    const indice = botones.indexOf(evento.currentTarget);
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const siguiente = indice + (evento.key === 'ArrowDown' ? 1 : -1);
      if (siguiente < 0) entrada.current?.focus();
      else botones[Math.min(siguiente, botones.length - 1)]?.focus();
    } else if (evento.key === 'Escape') {
      setBusqueda('');
      entrada.current?.focus();
    }
  }

  return <div class="combo-buscador">
    <label class="campo-entrada"><span>{reemplazando !== null ? `Cambiar componente ${reemplazando + 1}` : 'Buscar producto o insumo'}</span>
      <input ref={entrada} type="search" autoComplete="off" value={busqueda} placeholder="Escribí parte del nombre o código" aria-describedby="ayuda-buscador-componentes" onInput={(evento) => { setBusqueda(evento.currentTarget.value); setAviso(''); }} onKeyDown={(evento) => {
        if (evento.key === 'ArrowDown' && visibles.length) { evento.preventDefault(); resultados.current?.querySelector('button')?.focus(); }
        else if (evento.key === 'Enter' && visibles.length) { evento.preventDefault(); elegir(visibles[0]); }
        else if (evento.key === 'Escape') { setBusqueda(''); }
      }} />
    </label>
    <p class="texto-cuerpo-s" id="ayuda-buscador-componentes">Tocá una coincidencia para {reemplazando !== null ? 'cambiar el componente conservando la cantidad' : 'agregarla con cantidad 1 y editarla después'}.</p>
    {palabras.length > 0 && <p class="texto-cuerpo-s" role="status">{coincidencias.length === 0 ? 'No encontramos productos ni insumos. Probá otra parte del nombre o el código.' : coincidencias.length > LIMITE_SUGERENCIAS ? `${coincidencias.length} coincidencias. Mostramos las primeras ${LIMITE_SUGERENCIAS}; escribí más para afinar.` : `${coincidencias.length} ${coincidencias.length === 1 ? 'coincidencia' : 'coincidencias'}.`}</p>}
    {visibles.length > 0 && <ul ref={resultados} class="combo-buscador__resultados" aria-label="Coincidencias de productos e insumos">{visibles.map((opcion) => <li key={`${opcion.tipo}:${opcion.id}`}>
      <button type="button" class="combo-buscador__resultado" onClick={() => elegir(opcion)} onKeyDown={tecladoResultado} aria-label={`${reemplazando !== null ? 'Elegir' : 'Agregar'} ${opcion.nombre}, ${opcion.codigo}, ${opcion.tipo === 'PRODUCTO' ? 'producto' : 'insumo'}`}>
        <strong>{opcion.nombre}</strong><span class="texto-cuerpo-s">{opcion.codigo} · {opcion.tipo === 'PRODUCTO' ? 'Producto' : 'Insumo'}{opcion.unidad ? ` · ${opcion.unidad}` : ''}</span>
      </button>
    </li>)}</ul>}
    {aviso && <p class="texto-cuerpo-s" role="status">{aviso}</p>}
    {reemplazando !== null && <button type="button" class="boton-texto" onClick={alCancelar}>Cancelar cambio de componente</button>}
  </div>;
}
