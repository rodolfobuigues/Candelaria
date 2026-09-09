/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { obtenerPedido, guardarPedido } from '../../../persistencia/pedidosRepo.js';
import { calcularDerivados, marcarEntregado } from '../../../persistencia/pedidoLogica.js';
import { formatearFecha, formatearFechaHora, formatearImporte } from '../../../config/formato.js';
import { construirMensajePedido } from '../Mensaje/Mensaje.jsx';
import { navegarA } from '../../enrutador.js';

function LineasPedido({ pedido }) {
  return (
    <ul class="pedido-ficha-lineas">
      {pedido.lineas.map((linea) => (
        <li key={linea.refId} class="pedido-ficha-linea">
          <div class="fila-lista__contenido">
            <strong class="nombre-truncado">{linea.nombreCongelado}</strong>
            <span class="texto-cuerpo-s fila-lista__codigo">{linea.codigoCongelado} · {linea.cantidad} unidad(es)</span>
          </div>
          <div class="pedido-ficha-linea__importe">
            {linea.precioAplicado !== linea.precioOriginal && <del>{formatearImporte(linea.precioOriginal)}</del>}
            <span class="importe">{formatearImporte(linea.precioAplicado * linea.cantidad)}</span>
            {linea.precioAplicado !== linea.precioOriginal && <span class="ajuste-chip">Ajustado {formatearImporte(linea.precioAplicado - linea.precioOriginal)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Totales({ pedido }) {
  return (
    <dl class="pedido-totales">
      <div><dt>Total</dt><dd>{formatearImporte(pedido.total)}</dd></div>
      <div><dt>Pagado</dt><dd>{formatearImporte(pedido.pagado)}</dd></div>
      <div class="pedido-totales__saldo"><dt>Saldo</dt><dd>{formatearImporte(pedido.saldo)}</dd></div>
    </dl>
  );
}

function BloquePagos({ pedido, registrar }) {
  return (
    <section class="ficha-seccion">
      <h2 class="texto-seccion">Pagos</h2>
      {pedido.pagos.length === 0 && <p class="texto-cuerpo-s lista-vacia">Todavía no hay pagos registrados.</p>}
      {pedido.pagos.length > 0 && (
        <ul class="pedido-pagos">
          {pedido.pagos.map((pago) => (
            <li key={pago.id} class={pago.anulado ? 'pago-anulado' : ''}>
              <span>{formatearFecha(pago.fecha)} · {pago.medio}</span>
              <strong class="importe">{formatearImporte(pago.monto)}</strong>
            </li>
          ))}
        </ul>
      )}
      {pedido.saldo > 0 && <button type="button" class="boton-secundario" onClick={registrar}>Registrar pago</button>}
    </section>
  );
}

function Historial({ pedido }) {
  const eventos = [...pedido.historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return (
    <section class="ficha-seccion">
      <h2 class="texto-seccion">Historial</h2>
      <ol class="pedido-historial">
        {eventos.map((evento, indice) => (
          <li key={`${evento.fecha}-${indice}`}>
            <strong>{evento.descripcion}</strong>
            <span class="texto-cuerpo-s">{formatearFechaHora(evento.fecha)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Pedido({ id }) {
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const mensaje = useMemo(() => pedido && construirMensajePedido(pedido), [pedido]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const resultado = await obtenerPedido(db, id);
        if (!resultado) throw new Error('No encontramos ese pedido.');
        if (activo) setPedido(resultado);
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [id]);

  async function actualizar(transformar) {
    setGuardando(true);
    setError(null);
    try {
      const db = await abrirDB();
      const actualizado = transformar(pedido, new Date().toISOString());
      await guardarPedido(db, actualizado);
      setPedido({ ...actualizado, ...calcularDerivados(actualizado) });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function marcarComoEntregado() {
    actualizar((actual, fecha) => marcarEntregado(actual, fecha));
  }

  async function copiarMensaje() {
    try {
      await globalThis.navigator.clipboard.writeText(mensaje);
    } catch (e) {
      setError('No se pudo copiar el mensaje en este dispositivo.');
    }
  }

  if (error && !pedido) return <p class="aviso">{error}</p>;
  if (!pedido) return <p class="texto-cuerpo-s">Cargando pedido…</p>;

  return (
    <section class="pedido-pantalla">
      <section class="pedido-cliente">
        <div>
          <span class="texto-cuerpo-s">Pedido #{pedido.numero} · {formatearFecha(pedido.fecha)}</span>
          <h2>{pedido.clienteNombre}</h2>
        </div>
        {pedido.clienteTelefono && <a href={`tel:${pedido.clienteTelefono}`} class="pedido-telefono">{pedido.clienteTelefono}</a>}
      </section>

      <section class="ficha-seccion">
        <h2 class="texto-seccion">Nota interna</h2>
        <p class="pedido-nota">{pedido.notaInterna || 'Sin nota interna.'}</p>
        <span class="texto-cuerpo-s">Privada. No se envía al cliente.</span>
      </section>

      <section class="ficha-seccion">
        <h2 class="texto-seccion">Líneas del pedido</h2>
        <LineasPedido pedido={pedido} />
      </section>

      <section class="ficha-seccion">
        <h2 class="texto-seccion">Totales</h2>
        <Totales pedido={pedido} />
      </section>

      <BloquePagos pedido={pedido} registrar={() => navegarA(`pago/${pedido.id}`)} />
      <Historial pedido={pedido} />

      {error && <p class="aviso">{error}</p>}
      <section class="pedido-acciones">
        {pedido.estadoEntrega === 'PENDIENTE' && <button type="button" class="boton-primario" disabled={guardando} onClick={marcarComoEntregado}>Marcar entregado</button>}
        <button type="button" class="boton-secundario" onClick={copiarMensaje}>Copiar mensaje</button>
      </section>
    </section>
  );
}
