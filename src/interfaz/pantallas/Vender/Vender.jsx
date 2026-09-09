/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { obtenerCatalogo } from '../../../persistencia/catalogoRepo.js';
import { guardarPedido, listarPedidos } from '../../../persistencia/pedidosRepo.js';
import { crearPedido } from '../../../persistencia/pedidoLogica.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

const FILTROS = [
  { id: 'TODOS', etiqueta: 'Todos' },
  { id: 'VELA', etiqueta: 'Velas' },
  { id: 'RECIPIENTE', etiqueta: 'Recipientes' },
  { id: 'COMBO', etiqueta: 'Combos' },
];

function normalizar(texto) {
  return texto.trim().toLocaleLowerCase('es-AR');
}

function idNuevo(prefijo) {
  const aleatorio = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefijo}-${aleatorio}`;
}

function formatearCantidad(cantidad) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(cantidad);
}

function describirCombo(combo, productosPorId, insumosPorId) {
  return combo.lineas
    .map((linea) => {
      const componente = productosPorId.get(linea.refId) ?? insumosPorId.get(linea.refId);
      return `${formatearCantidad(linea.cantidad)} × ${componente?.nombre ?? linea.refId}`;
    })
    .join(', ');
}

function construirArticulos(catalogo, insumos) {
  const productosPorId = new Map(catalogo.productos.map((producto) => [producto.id, producto]));
  const insumosPorId = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const productos = catalogo.productos.map((producto) => ({
    id: producto.id,
    tipo: 'PRODUCTO',
    categoria: producto.categoria,
    nombre: producto.nombre,
    codigo: producto.codigo,
    precio: producto.precio,
  }));
  const combos = catalogo.combos.map((combo) => ({
    id: combo.id,
    tipo: 'COMBO',
    categoria: 'COMBO',
    nombre: `Combo ${combo.id} · ${combo.nombre}`,
    codigo: combo.id,
    precio: combo.precioCombo,
    descripcion: describirCombo(combo, productosPorId, insumosPorId),
  }));
  return [...combos, ...productos];
}

function Articulo({ articulo, agregar }) {
  return (
    <li class="fila-lista vender-articulo">
      <div class="fila-lista__contenido">
        <strong class="nombre-truncado">{articulo.nombre}</strong>
        <span class="texto-cuerpo-s fila-lista__codigo">{articulo.codigo}</span>
        {articulo.descripcion && <span class="texto-cuerpo-s vender-articulo__descripcion">{articulo.descripcion}</span>}
      </div>
      <span class="importe vender-articulo__precio">{formatearImporte(articulo.precio)}</span>
      <button
        type="button"
        class="vender-articulo__agregar"
        aria-label={`Agregar ${articulo.nombre}`}
        onClick={() => agregar(articulo)}
      >+
      </button>
    </li>
  );
}

function SelectorCantidad({ cantidad, cambiar }) {
  return (
    <div class="selector-cantidad" aria-label="Cantidad">
      <button type="button" aria-label="Disminuir cantidad" onClick={() => cambiar(-1)}>−</button>
      <span class="cantidad">{cantidad}</span>
      <button type="button" aria-label="Aumentar cantidad" onClick={() => cambiar(1)}>+</button>
    </div>
  );
}

function LineaPedido({ linea, cambiarCantidad, cambiarPrecio, quitar }) {
  return (
    <li class="pedido-linea">
      <div class="pedido-linea__encabezado">
        <div class="fila-lista__contenido">
          <strong class="nombre-truncado">{linea.nombre}</strong>
          <span class="texto-cuerpo-s fila-lista__codigo">{linea.codigo}</span>
        </div>
        <button type="button" class="boton-texto" onClick={quitar}>Quitar</button>
      </div>
      <div class="pedido-linea__controles">
        <SelectorCantidad cantidad={linea.cantidad} cambiar={(delta) => cambiarCantidad(linea.refId, delta)} />
        <label class="campo-entrada pedido-linea__precio">
          <span>Precio</span>
          <input
            type="number"
            min="0"
            step="100"
            value={linea.precioAplicado}
            onInput={(evento) => cambiarPrecio(linea.refId, evento.currentTarget.value)}
            aria-label={`Precio aplicado de ${linea.nombre}`}
          />
        </label>
        <strong class="importe">{formatearImporte(linea.precioAplicado * linea.cantidad)}</strong>
      </div>
      {linea.precioAplicado !== linea.precioOriginal && (
        <span class="texto-cuerpo-s pedido-linea__diferencia">
          Precio original {formatearImporte(linea.precioOriginal)} · diferencia {formatearImporte(linea.precioAplicado - linea.precioOriginal)}
        </span>
      )}
    </li>
  );
}

function FormularioPedido({ lineas, total, cliente, setCliente, guardar, guardando, error }) {
  const puedeGuardar = lineas.length > 0 && cliente.nombre.trim().length > 0 && !guardando;
  return (
    <section class="tarjeta vender-pedido" aria-label="Pedido actual">
      <div class="vender-pedido__titulo">
        <h2 class="texto-seccion">Pedido actual</h2>
        <strong class="importe-l">{formatearImporte(total)}</strong>
      </div>
      {lineas.length === 0 && <p class="texto-cuerpo-s lista-vacia">Todavía no agregaste productos.</p>}
      {lineas.length > 0 && (
        <ul class="pedido-lineas">
          {lineas.map((linea) => (
            <LineaPedido
              key={linea.refId}
              linea={linea}
              cambiarCantidad={cliente.cambiarCantidad}
              cambiarPrecio={cliente.cambiarPrecio}
              quitar={() => cliente.quitar(linea.refId)}
            />
          ))}
        </ul>
      )}
      <div class="vender-datos-cliente">
        <label class="campo-entrada">
          <span>Nombre del cliente *</span>
          <input value={cliente.nombre} onInput={(e) => setCliente({ ...cliente, nombre: e.currentTarget.value })} />
        </label>
        <label class="campo-entrada">
          <span>Teléfono</span>
          <input type="tel" value={cliente.telefono} onInput={(e) => setCliente({ ...cliente, telefono: e.currentTarget.value })} />
        </label>
        <label class="campo-entrada">
          <span>Nota interna</span>
          <textarea rows="3" value={cliente.nota} onInput={(e) => setCliente({ ...cliente, nota: e.currentTarget.value })} />
        </label>
      </div>
      {error && <p class="aviso">No se pudo guardar el pedido: {error}</p>}
      <button type="button" class="boton-primario" disabled={!puedeGuardar} onClick={guardar}>Guardar pedido</button>
    </section>
  );
}

export function Vender() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [lineas, setLineas] = useState([]);
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', nota: '' });
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const parametros = await obtenerParametrosVigentes(db);
        const [catalogo, pedidos, insumos] = await Promise.all([
          obtenerCatalogo(db, parametros),
          listarPedidos(db),
          obtenerTodos(db, TIENDAS.INSUMOS),
        ]);
        if (activo) setDatos({ articulos: construirArticulos(catalogo, insumos), siguienteNumero: pedidos.length + 1 });
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, []);

  const visibles = useMemo(() => {
    if (!datos) return [];
    const texto = normalizar(busqueda);
    return datos.articulos.filter((articulo) => {
      const coincideFiltro = filtro === 'TODOS' || articulo.categoria === filtro;
      const coincideBusqueda = !texto || normalizar(`${articulo.nombre} ${articulo.codigo}`).includes(texto);
      return coincideFiltro && coincideBusqueda;
    });
  }, [datos, filtro, busqueda]);

  const total = lineas.reduce((suma, linea) => suma + linea.precioAplicado * linea.cantidad, 0);

  function agregar(articulo) {
    setConfirmacion(null);
    setLineas((actuales) => {
      const existente = actuales.find((linea) => linea.refId === articulo.id);
      if (existente) {
        return actuales.map((linea) => linea.refId === articulo.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea);
      }
      return [...actuales, {
        tipo: articulo.tipo,
        refId: articulo.id,
        nombre: articulo.nombre,
        codigo: articulo.codigo,
        nombreCongelado: articulo.nombre,
        precioOriginal: articulo.precio,
        precioAplicado: articulo.precio,
        cantidad: 1,
      }];
    });
  }

  function cambiarCantidad(refId, delta) {
    setLineas((actuales) => actuales
      .map((linea) => linea.refId === refId ? { ...linea, cantidad: linea.cantidad + delta } : linea)
      .filter((linea) => linea.cantidad > 0));
  }

  function cambiarPrecio(refId, valor) {
    const precio = Number(valor);
    if (!Number.isFinite(precio) || precio < 0) return;
    setLineas((actuales) => actuales.map((linea) => linea.refId === refId ? { ...linea, precioAplicado: precio } : linea));
  }

  async function guardar() {
    if (!datos || lineas.length === 0 || !cliente.nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const fecha = new Date().toISOString();
      const pedido = crearPedido({
        id: idNuevo('pedido'),
        numero: datos.siguienteNumero,
        fecha,
        clienteNombre: cliente.nombre.trim(),
        clienteTelefono: cliente.telefono.trim(),
        notaInterna: cliente.nota.trim(),
        lineas: lineas.map(({ nombre, codigo, ...linea }) => ({ ...linea, codigoCongelado: codigo })),
      });
      const db = await abrirDB();
      await guardarPedido(db, pedido);
      setConfirmacion({ id: pedido.id, numero: pedido.numero, total });
      setLineas([]);
      setCliente({ nombre: '', telefono: '', nota: '' });
      setMostrarPedido(false);
      setDatos({ ...datos, siguienteNumero: datos.siguienteNumero + 1 });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const accionesCliente = {
    ...cliente,
    cambiarCantidad,
    cambiarPrecio,
    quitar: (refId) => setLineas((actuales) => actuales.filter((linea) => linea.refId !== refId)),
  };

  return (
    <section class="vender-pantalla">
      <label class="campo-entrada vender-buscador">
        <span>Buscar producto o combo</span>
        <input type="search" value={busqueda} onInput={(e) => setBusqueda(e.currentTarget.value)} placeholder="Nombre o código" />
      </label>
      <div class="fila-chips vender-filtros" role="group" aria-label="Filtrar catálogo">
        {FILTROS.map((item) => (
          <button type="button" class="chip-filtro" aria-pressed={filtro === item.id} onClick={() => setFiltro(item.id)} key={item.id}>{item.etiqueta}</button>
        ))}
      </div>
      {error && !mostrarPedido && <p class="aviso">No se pudo cargar el catálogo: {error}</p>}
      {!datos && !error && <p class="texto-cuerpo-s">Cargando catálogo…</p>}
      {datos && visibles.length === 0 && <p class="texto-cuerpo-s lista-vacia">No encontramos productos con esa búsqueda.</p>}
      {datos && visibles.length > 0 && (
        <ul class="lista vender-lista">
          {visibles.map((articulo) => <Articulo key={`${articulo.tipo}-${articulo.id}`} articulo={articulo} agregar={agregar} />)}
        </ul>
      )}
      {confirmacion && (
        <section class="tarjeta vender-confirmacion" aria-live="polite">
          <strong>Pedido #{confirmacion.numero} guardado</strong>
          <span class="texto-cuerpo-s">Total {formatearImporte(confirmacion.total)} · entrega pendiente</span>
          <button type="button" class="boton-primario" onClick={() => navegarA(`mensaje/${confirmacion.id}`)}>Ver mensaje</button>
          <button type="button" class="boton-secundario" onClick={() => navegarA(`pedido/${confirmacion.id}`)}>Abrir pedido</button>
        </section>
      )}
      {mostrarPedido && (
        <FormularioPedido
          lineas={lineas}
          total={total}
          cliente={accionesCliente}
          setCliente={setCliente}
          guardar={guardar}
          guardando={guardando}
          error={error}
        />
      )}
      {lineas.length > 0 && !mostrarPedido && (
        <div class="barra-flotante-carrito">
          <span>{lineas.reduce((suma, linea) => suma + linea.cantidad, 0)} artículos · {formatearImporte(total)}</span>
          <button type="button" class="boton-barra" onClick={() => setMostrarPedido(true)}>Ver pedido</button>
        </div>
      )}
    </section>
  );
}
