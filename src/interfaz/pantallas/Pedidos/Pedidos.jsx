/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { listarPedidos } from '../../../persistencia/pedidosRepo.js';
import { formatearFecha, formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

const FILTROS = [
  { id: 'SALDO', etiqueta: 'Con saldo' },
  { id: 'ENTREGAR', etiqueta: 'A entregar' },
  { id: 'CERRADOS', etiqueta: 'Cerrados' },
];

function esCerrado(pedido) {
  return pedido.estadoEntrega === 'ENTREGADO' && pedido.saldo <= 0;
}

function coincideFiltro(pedido, filtro) {
  if (filtro === 'SALDO') return pedido.saldo > 0;
  if (filtro === 'ENTREGAR') return pedido.estadoEntrega === 'PENDIENTE';
  return esCerrado(pedido);
}

function etiquetaCobro(estadoCobro) {
  return estadoCobro.toLowerCase().replace('_', '-');
}

function TarjetaPedido({ pedido }) {
  const importe = pedido.saldo > 0 ? pedido.saldo : pedido.total;
  const rotuloImporte = pedido.saldo > 0 ? 'SALDO' : 'TOTAL';
  return (
    <li>
      <button type="button" class={`tarjeta tarjeta-pedido tarjeta-pedido--${pedido.estadoEntrega.toLowerCase()}`} onClick={() => navegarA(`pedido/${pedido.id}`)}>
        <div class="tarjeta-pedido__cabecera">
          <div class="fila-lista__contenido">
            <strong class="nombre-truncado">{pedido.clienteNombre}</strong>
            <span class="texto-cuerpo-s fila-lista__codigo">Pedido #{pedido.numero} · {formatearFecha(pedido.fecha)}</span>
          </div>
          <div class="tarjeta-pedido__importe">
            <span class="etiqueta">{rotuloImporte}</span>
            <strong class="importe">{formatearImporte(importe)}</strong>
          </div>
        </div>
        <div class="tarjeta-pedido__estados">
          <span class={`etiqueta-estado etiqueta-estado--${pedido.estadoEntrega.toLowerCase()}`}>{pedido.estadoEntrega}</span>
          <span class={`etiqueta-estado etiqueta-estado--${etiquetaCobro(pedido.estadoCobro)}`}>{pedido.estadoCobro}</span>
        </div>
      </button>
    </li>
  );
}

export function Pedidos() {
  const [filtro, setFiltro] = useState('SALDO');
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const resultado = await listarPedidos(db);
        if (activo) setPedidos(resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, []);

  const visibles = useMemo(() => pedidos?.filter((pedido) => coincideFiltro(pedido, filtro)) ?? [], [pedidos, filtro]);

  return (
    <section class="pedidos-pantalla">
      <div class="fila-chips pedidos-filtros" role="group" aria-label="Filtrar pedidos">
        {FILTROS.map((item) => (
          <button type="button" class="chip-filtro" aria-pressed={filtro === item.id} onClick={() => setFiltro(item.id)} key={item.id}>{item.etiqueta}</button>
        ))}
      </div>
      {error && <p class="aviso">No se pudieron cargar los pedidos: {error}</p>}
      {!pedidos && !error && <p class="texto-cuerpo-s">Cargando pedidos…</p>}
      {pedidos && visibles.length === 0 && (
        <section class="pedidos-vacio">
          <h2 class="texto-seccion">No hay pedidos en este filtro</h2>
          <p class="texto-cuerpo-s">Los pedidos nuevos aparecerán acá cuando los guardes desde Vender.</p>
        </section>
      )}
      {pedidos && visibles.length > 0 && (
        <ul class="pedidos-lista">
          {visibles.map((pedido) => <TarjetaPedido key={pedido.id} pedido={pedido} />)}
        </ul>
      )}
    </section>
  );
}
