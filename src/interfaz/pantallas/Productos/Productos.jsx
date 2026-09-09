/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { navegarA } from '../../enrutador.js';
import { abrirDB, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { obtenerCatalogo } from '../../../persistencia/catalogoRepo.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { formatearImporte, formatearCostoUnitario } from '../../../config/formato.js';

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
      <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`producto/${producto.id}`)}>
        <div class="fila-lista__contenido">
          <strong class="nombre-truncado">{producto.nombre}</strong>
          <span class="texto-cuerpo-s fila-lista__codigo">{producto.codigo}</span>
        </div>
        <div class="fila-lista__importes">
          <span class="importe">{formatearImporte(producto.precio)}</span>
          <span class="texto-cuerpo-s fila-lista__costo">costo {formatearImporte(producto.costoProduccion)}</span>
        </div>
      </button>
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
          <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`combo-editar/${combo.id}`)}>
          <div class="fila-lista__contenido">
            <strong class="nombre-truncado">Combo {combo.id} · {combo.nombre}</strong>
            <span class="texto-cuerpo-s fila-lista__codigo nombre-truncado" title={describirCombo(combo, productosPorId, insumosPorId)}>
              {describirCombo(combo, productosPorId, insumosPorId)}
            </span>
          </div>
          <span class="importe">{formatearImporte(combo.precioCombo)}</span>
          </button>
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
          <button type="button" class="fila-lista fila-lista--interactiva" onClick={() => navegarA(`insumo-editar/${insumo.id}`)}>
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
  const [solapa, setSolapa] = useState('combos');
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const parametros = await obtenerParametrosVigentes(db);
        const [catalogo, insumos] = await Promise.all([
          obtenerCatalogo(db, parametros),
          obtenerTodos(db, TIENDAS.INSUMOS),
        ]);
        if (activo) setDatos({ ...catalogo, insumos });
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, []);

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
            aria-selected={solapa === item.id}
            onClick={() => { setSolapa(item.id); setBusqueda(''); }}
            key={item.id}
          >
            {item.etiqueta}
          </button>
        ))}
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

      {error && <p class="aviso">No se pudo cargar el catálogo: {error}</p>}
      {!datos && !error && <p class="texto-cuerpo-s">Cargando catálogo…</p>}
      {datos && solapa === 'productos' && <ListaProductos productos={datos.productos} busqueda={busqueda} />}
      {datos && solapa === 'combos' && (
        <ListaCombos
          combos={datos.combos}
          productosPorId={indices.productosPorId}
          insumosPorId={indices.insumosPorId}
          busqueda={busqueda}
        />
      )}
      {datos && solapa === 'insumos' && <ListaInsumos insumos={datos.insumos} busqueda={busqueda} />}

      <button type="button" class="boton-flotante" aria-label={`Nuevo ${solapa === 'combos' ? 'combo' : solapa === 'productos' ? 'producto' : 'insumo'}`} onClick={() => navegarA(`${solapa === 'combos' ? 'combo-nuevo' : solapa === 'productos' ? 'producto-nuevo' : 'insumo-nuevo'}`)}>+</button>
    </section>
  );
}
