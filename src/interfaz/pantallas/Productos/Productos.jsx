/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { navegarA, useRuta } from '../../enrutador.js';
import { abrirDB } from '../../../persistencia/db.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { cargarAdministracion } from '../../cargaAdministracion.js';
import { formatearImporte, formatearCostoUnitario } from '../../../config/formato.js';
import { VisorFotos } from '../../comun/GaleriaFotos.jsx';

const SOLAPAS = [
  { id: 'combos', etiqueta: 'Combos' },
  { id: 'productos', etiqueta: 'Productos' },
  { id: 'insumos', etiqueta: 'Insumos' },
];

const ETIQUETAS_CATEGORIA = {
  VELA: 'Velas',
  RECIPIENTE: 'Recipientes',
  REPOSICION: 'Reposiciones',
};

function normalizar(texto) {
  return texto.trim().toLocaleLowerCase('es-AR');
}

function formatearCantidad(cantidad) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(cantidad);
}

function coincide(texto, busqueda) {
  return normalizar(texto).includes(normalizar(busqueda));
}

function obtenerNombre(refId, productosPorId, insumosPorId) {
  return productosPorId.get(refId)?.nombre ?? insumosPorId.get(refId)?.nombre ?? refId;
}

function describirCombo(combo, productosPorId, insumosPorId) {
  return combo.lineas
    .map((linea) => `${formatearCantidad(linea.cantidad)} × ${obtenerNombre(linea.refId, productosPorId, insumosPorId)}`)
    .join(', ');
}

function agruparProductos(productos) {
  return productos.reduce((grupos, producto) => {
    const categoria = producto.categoria;
    if (!grupos[categoria]) grupos[categoria] = [];
    grupos[categoria].push(producto);
    return grupos;
  }, {});
}

function FilaProducto({ producto }) {
  return (
    <li>
      <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`producto/${encodeURIComponent(producto.id)}?origen=productos`)}>
        <div class="fila-lista__contenido">
          <strong class="nombre-truncado">{producto.nombre}</strong>
          <span class="texto-cuerpo-s fila-lista__codigo">{producto.codigo}</span>
        </div>
        <div class="fila-lista__importes">
          <span class="importe">{formatearImporte(producto.precio)}</span>
          <span class="texto-cuerpo-s fila-lista__costo">costo {formatearImporte(producto.costoProduccion)}</span>
        </div>
      </button>
      <VisorFotos fotos={producto.fotos} />
    </li>
  );
}

function ListaProductos({ productos, busqueda }) {
  const grupos = agruparProductos(productos.filter((producto) =>
    coincide(`${producto.nombre} ${producto.codigo}`, busqueda)
  ));
  const categorias = ['VELA', 'RECIPIENTE', 'REPOSICION'];

  return (
    <div class="lista">
      {categorias.map((categoria) => {
        const items = grupos[categoria] ?? [];
        if (items.length === 0) return null;
        return (
          <section class="lista-seccion" key={categoria}>
            <h2 class="etiqueta lista-seccion__titulo">{ETIQUETAS_CATEGORIA[categoria]}</h2>
            <ul class="lista-seccion__items">
              {items.map((producto) => <FilaProducto key={producto.id} producto={producto} />)}
            </ul>
          </section>
        );
      })}
      {productos.length > 0 && Object.keys(grupos).every((categoria) => grupos[categoria].length === 0) && (
        <p class="texto-cuerpo-s">No encontramos productos con esa búsqueda.</p>
      )}
    </div>
  );
}

function ListaCombos({ combos, productosPorId, insumosPorId, busqueda }) {
  const visibles = combos.filter((combo) => coincide(
    `${combo.id} ${combo.nombre} ${describirCombo(combo, productosPorId, insumosPorId)}`,
    busqueda
  ));

  return (
    <ul class="lista">
      {visibles.map((combo) => (
        <li key={combo.id}>
          <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`combo-editar/${encodeURIComponent(combo.id)}?origen=combos`)}>
          <div class="fila-lista__contenido">
            <strong class="nombre-truncado">Combo {combo.id} · {combo.nombre}</strong>
            <span class="texto-cuerpo-s fila-lista__codigo nombre-truncado" title={describirCombo(combo, productosPorId, insumosPorId)}>
              {describirCombo(combo, productosPorId, insumosPorId)}
            </span>
          </div>
          <span class="importe">{formatearImporte(combo.precioCombo)}</span>
          </button>
          <VisorFotos fotos={combo.fotos} />
        </li>
      ))}
      {visibles.length === 0 && <li class="texto-cuerpo-s lista-vacia">No encontramos combos con esa búsqueda.</li>}
    </ul>
  );
}

function ListaInsumos({ insumos, busqueda }) {
  const visibles = insumos.filter((insumo) => coincide(`${insumo.nombre} ${insumo.codigo}`, busqueda));

  return (
    <ul class="lista">
      {visibles.map((insumo) => (
        <li key={insumo.id}>
          <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`insumo-editar/${encodeURIComponent(insumo.id)}?origen=insumos`)}>
          <div class="fila-lista__contenido">
            <strong class="nombre-truncado">{insumo.nombre}</strong>
            <span class="texto-cuerpo-s fila-lista__codigo">{insumo.codigo} · {insumo.unidad}</span>
          </div>
          <span class="importe">{formatearCostoUnitario(insumo.montoCompra / insumo.cantidadCompra)}</span>
          </button>
        </li>
      ))}
      {visibles.length === 0 && <li class="texto-cuerpo-s lista-vacia">No encontramos insumos con esa búsqueda.</li>}
    </ul>
  );
}

export function Productos() {
  const ruta = useRuta();
  const [solapa, setSolapa] = useState('combos');
  const botonesSolapa = useRef(new Map());
  useEffect(() => { const solicitada = new URLSearchParams(ruta.split('?')[1] ?? '').get('solapa'); setSolapa(SOLAPAS.some((item) => item.id === solicitada) ? solicitada : 'combos'); }, [ruta]);
  function seleccionarSolapa(id, enfocar = false) {
    setSolapa(id); setBusqueda('');
    navegarA(`productos?solapa=${id}`);
    if (enfocar) botonesSolapa.current.get(id)?.focus();
  }
  function navegarSolapas(evento, id) {
    const indice = SOLAPAS.findIndex((item) => item.id === id);
    const destinos = { ArrowRight: (indice + 1) % SOLAPAS.length, ArrowLeft: (indice + SOLAPAS.length - 1) % SOLAPAS.length, Home: 0, End: SOLAPAS.length - 1 };
    if (!(evento.key in destinos)) return;
    evento.preventDefault();
    seleccionarSolapa(SOLAPAS[destinos[evento.key]].id, true);
  }
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true); setError(null);
      try {
        const db = await abrirDB();
        const resultado = await cargarAdministracion(db);
        if (activo) { setDatos(resultado.datos); setError(resultado.error); }
      } catch (e) {
        if (activo) setError(e.message);
      } finally { if (activo) setCargando(false); }
    }
    cargar();
    return () => { activo = false; };
  }, [reintento]);

  const indices = useMemo(() => {
    if (!datos) return { productosPorId: new Map(), insumosPorId: new Map() };
    return {
      productosPorId: new Map(datos.productos.map((producto) => [producto.id, producto])),
      insumosPorId: new Map(datos.insumos.map((insumo) => [insumo.id, insumo])),
    };
  }, [datos]);

  return (
    <section class="productos-pantalla">
      <div class="solapas" role="tablist" aria-label="Administrar catálogo">
        {SOLAPAS.map((item) => (
          <button
            type="button"
            role="tab"
            id={`solapa-catalogo-${item.id}`}
            aria-controls={`panel-catalogo-${item.id}`}
            tabIndex={solapa === item.id ? 0 : -1}
            ref={(elemento) => { if (elemento) botonesSolapa.current.set(item.id, elemento); else botonesSolapa.current.delete(item.id); }}
            aria-selected={solapa === item.id}
            onKeyDown={(evento) => navegarSolapas(evento, item.id)}
            onClick={() => seleccionarSolapa(item.id)}
            key={item.id}
          >
            {item.etiqueta}
          </button>
        ))}
      </div>

      <div class="productos-acciones">
        <button
          type="button"
          class="boton-primario"
          onClick={() => navegarA(`${solapa === 'combos' ? 'combo-nuevo' : solapa === 'productos' ? 'producto-nuevo' : 'insumo-nuevo'}`)}
        >
          + Nuevo {solapa === 'combos' ? 'combo' : solapa === 'productos' ? 'producto' : 'insumo'}
        </button>
      </div>

      <label class="campo-entrada productos-buscador">
        <span>Buscar</span>
        <input
          type="search"
          value={busqueda}
          onInput={(evento) => setBusqueda(evento.currentTarget.value)}
          placeholder="Nombre o código"
          aria-label="Buscar en el catálogo"
        />
      </label>

      {error && <div class="aviso" role="alert"><p>{error}</p><button type="button" class="boton-secundario" disabled={cargando} onClick={() => { invalidarCatalogo(); setReintento((actual) => actual + 1); }}>Reintentar carga</button></div>}
      {cargando && <p class="texto-cuerpo-s" role="status">Cargando catálogo…</p>}
      <section role="tabpanel" id="panel-catalogo-productos" aria-labelledby="solapa-catalogo-productos" hidden={solapa !== 'productos'} tabIndex={0}>{datos?.calculado && solapa === 'productos' && <ListaProductos productos={datos.productos} busqueda={busqueda} />}</section>
      <section role="tabpanel" id="panel-catalogo-combos" aria-labelledby="solapa-catalogo-combos" hidden={solapa !== 'combos'} tabIndex={0}>{datos?.calculado && solapa === 'combos' && (
        <ListaCombos
          combos={datos.combos}
          productosPorId={indices.productosPorId}
          insumosPorId={indices.insumosPorId}
          busqueda={busqueda}
        />
      )}</section>
      <section role="tabpanel" id="panel-catalogo-insumos" aria-labelledby="solapa-catalogo-insumos" hidden={solapa !== 'insumos'} tabIndex={0}>{datos && solapa === 'insumos' && <ListaInsumos insumos={datos.insumos} busqueda={busqueda} />}</section>


    </section>
  );
}
