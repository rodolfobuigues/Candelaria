/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { obtenerPedido, guardarPedido } from '../../../persistencia/pedidosRepo.js';
import { anularPago, calcularDerivados, corregirEntrega, marcarEntregado, registrarMensaje } from '../../../persistencia/pedidoLogica.js';
import { construirMensajePedido } from '../../../persistencia/mensajes.js';
import { formatearFecha, formatearFechaHora, formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

function idNuevo(prefijo) {
  return `${prefijo}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

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

function BloquePagos({ pedido, registrar, pagoEnCorreccion, motivo, cambiarMotivo, solicitarAnulacion, cancelarCorreccion, confirmarAnulacion, guardando }) {
  return (
    <section class="ficha-seccion">
      <h2 class="texto-seccion">Pagos</h2>
      {pedido.pagos.length === 0 && <p class="texto-cuerpo-s lista-vacia">Todavía no hay pagos registrados.</p>}
      {pedido.pagos.length > 0 && (
        <ul class="pedido-pagos">
          {pedido.pagos.map((pago) => (
            <li key={pago.id} class={pago.anulado ? 'pago-anulado' : ''}>
              <div class="pedido-pago__resumen">
                <span>{formatearFecha(pago.fecha)} · {pago.medio}</span>
                <strong class="importe">{formatearImporte(pago.monto)}</strong>
              </div>
              {pago.anulado && (
                <div class="pedido-correccion__detalle">
                  <strong>ANULADO · {formatearFechaHora(pago.fechaAnulacion)}</strong>
                  <span>Motivo: {pago.motivoAnulacion ?? 'Sin motivo informado.'}</span>
                </div>
              )}
              {!pago.anulado && pagoEnCorreccion !== pago.id && (
                <button type="button" class="boton-secundario" disabled={guardando} onClick={() => solicitarAnulacion(pago.id)}>Anular pago</button>
              )}
              {pagoEnCorreccion === pago.id && (
                <div class="pedido-correccion">
                  <label class="campo-entrada">
                    <span>Motivo de la anulación *</span>
                    <textarea rows="3" value={motivo} onInput={(evento) => cambiarMotivo(evento.currentTarget.value)} />
                  </label>
                  <div class="fila-botones">
                    <button type="button" class="boton-secundario" disabled={guardando} onClick={cancelarCorreccion}>Cancelar</button>
                    <button type="button" class="boton-primario" disabled={guardando || !motivo.trim()} onClick={() => confirmarAnulacion(pago.id)}>Confirmar anulación</button>
                  </div>
                </div>
              )}
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

function MensajesGenerados({ pedido, copiar }) {
  const mensajes = [...pedido.historial]
    .filter((evento) => evento.tipo === 'MENSAJE_GENERADO' && evento.texto)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (mensajes.length === 0) return null;
  return (
    <section class="ficha-seccion">
      <h2 class="texto-seccion">Mensajes generados</h2>
      <ul class="pedido-mensajes">
        {mensajes.map((evento) => (
          <li key={evento.id ?? evento.fecha} class={evento.vigente === false ? 'mensaje-no-vigente' : ''}>
            <span class="texto-cuerpo-s">{evento.categoria ? `${evento.categoria.replaceAll('_', ' ').replace(/^./, (letra) => letra.toUpperCase())} · ` : ''}{formatearFechaHora(evento.fecha)}</span>
            {evento.vigente === false && (
              <span class="mensaje-no-vigente__estado">YA NO VIGENTE · {formatearFechaHora(evento.fechaInvalidacion)}</span>
            )}
            <pre class="mensaje-contenido">{evento.texto}</pre>
            {evento.vigente === false && <span class="texto-cuerpo-s">Motivo: {evento.motivoInvalidacion}</span>}
            <button type="button" class="boton-secundario" onClick={() => copiar(evento)}>Copiar mensaje</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Pedido({ id, origen = 'pedidos', filtroOrigen = null }) {
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [correccion, setCorreccion] = useState(null);
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
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

  async function actualizar(transformar, despuesDeGuardar = null) {
    setGuardando(true);
    setError(null);
    try {
      const db = await abrirDB();
      const actualizado = transformar(pedido, new Date().toISOString());
      await guardarPedido(db, actualizado);
      setPedido({ ...actualizado, ...calcularDerivados(actualizado) });
      despuesDeGuardar?.(actualizado);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function marcarComoEntregado() {
    const entregaId = idNuevo('entrega');
    actualizar(
      (actual, fecha) => marcarEntregado(actual, fecha, entregaId),
      () => navegarA(`mensaje/${pedido.id}?tipo=entrega&accionId=${encodeURIComponent(entregaId)}&origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`)
    );
  }

  function solicitarCorreccion(tipo, id = null) {
    setError(null);
    setCorreccion({ tipo, id });
    setMotivoCorreccion('');
  }

  function cancelarCorreccion() {
    setCorreccion(null);
    setMotivoCorreccion('');
  }

  function confirmarAnulacionPago(pagoId) {
    const motivo = motivoCorreccion.trim();
    if (!motivo) {
      setError('Indicá el motivo de la anulación.');
      return;
    }
    const correccionId = idNuevo('anulacion-pago');
    actualizar(
      (actual, fecha) => anularPago(actual, pagoId, fecha, motivo, correccionId),
      () => navegarA(`mensaje/${pedido.id}?tipo=pago_anulado&pagoId=${encodeURIComponent(pagoId)}&accionId=${encodeURIComponent(correccionId)}&origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`)
    );
  }

  function confirmarCorreccionEntrega() {
    const motivo = motivoCorreccion.trim();
    if (!motivo) {
      setError('Indicá el motivo de la corrección de entrega.');
      return;
    }
    const correccionId = idNuevo('correccion-entrega');
    actualizar(
      (actual, fecha) => corregirEntrega(actual, fecha, motivo, correccionId),
      () => navegarA(`mensaje/${pedido.id}?tipo=entrega_corregida&accionId=${encodeURIComponent(correccionId)}&origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`)
    );
  }

  async function copiarMensaje(evento = null) {
    try {
      const texto = evento?.texto ?? mensaje;
      await globalThis.navigator.clipboard.writeText(texto);
      if (!evento) {
        const db = await abrirDB();
        const registrado = registrarMensaje(pedido, { id: globalThis.crypto?.randomUUID?.() ?? `mensaje-${Date.now()}`, fecha: new Date().toISOString(), texto, categoria: 'confirmacion' });
        await guardarPedido(db, registrado);
        setPedido({ ...registrado, ...calcularDerivados(registrado) });
      }
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

      <BloquePagos
        pedido={pedido}
        registrar={() => navegarA(`pago/${pedido.id}?origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`)}
        pagoEnCorreccion={correccion?.tipo === 'pago' ? correccion.id : null}
        motivo={motivoCorreccion}
        cambiarMotivo={setMotivoCorreccion}
        solicitarAnulacion={(pagoId) => solicitarCorreccion('pago', pagoId)}
        cancelarCorreccion={cancelarCorreccion}
        confirmarAnulacion={confirmarAnulacionPago}
        guardando={guardando}
      />
      <MensajesGenerados pedido={pedido} copiar={copiarMensaje} />
      <Historial pedido={pedido} />

      {error && <p class="aviso">{error}</p>}
      <section class="pedido-acciones">
        {pedido.estadoEntrega === 'PENDIENTE' && <button type="button" class="boton-primario" disabled={guardando} onClick={marcarComoEntregado}>Marcar entregado</button>}
        {pedido.estadoEntrega === 'ENTREGADO' && correccion?.tipo !== 'entrega' && (
          <button type="button" class="boton-secundario" disabled={guardando} onClick={() => solicitarCorreccion('entrega')}>Corregir entrega</button>
        )}
        {correccion?.tipo === 'entrega' && (
          <section class="pedido-correccion tarjeta">
            <label class="campo-entrada">
              <span>Motivo de la corrección de entrega *</span>
              <textarea rows="3" value={motivoCorreccion} onInput={(evento) => setMotivoCorreccion(evento.currentTarget.value)} />
            </label>
            <div class="fila-botones">
              <button type="button" class="boton-secundario" disabled={guardando} onClick={cancelarCorreccion}>Cancelar</button>
              <button type="button" class="boton-primario" disabled={guardando || !motivoCorreccion.trim()} onClick={confirmarCorreccionEntrega}>Confirmar corrección</button>
            </div>
          </section>
        )}
        <button type="button" class="boton-secundario" onClick={copiarMensaje}>Copiar mensaje</button>
      </section>
    </section>
  );
}
