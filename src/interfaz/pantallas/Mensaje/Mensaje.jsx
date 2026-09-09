/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { obtenerPedido } from '../../../persistencia/pedidosRepo.js';
import { formatearImporte } from '../../../config/formato.js';

export function construirMensajePedido(pedido) {
  const lineas = pedido.lineas.map((linea) => `• ${linea.cantidad} × ${linea.nombreCongelado} — ${formatearImporte(linea.precioAplicado * linea.cantidad)}`);
  return `Hola ${pedido.clienteNombre}, este es el detalle de tu pedido #${pedido.numero}:\n\n${lineas.join('\n')}\n\nTotal: ${formatearImporte(pedido.total)}\n¡Gracias!`;
}

export function Mensaje({ id }) {
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);
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

  async function copiar() {
    try {
      await globalThis.navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch (e) {
      setError('No se pudo copiar el mensaje en este dispositivo.');
    }
  }

  function abrirWhatsApp() {
    const telefono = pedido.clienteTelefono.replace(/\D/g, '');
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }

  if (error && !pedido) return <p class="aviso">{error}</p>;
  if (!pedido) return <p class="texto-cuerpo-s">Cargando mensaje…</p>;

  const tieneTelefono = pedido.clienteTelefono.trim().length > 0;
  return (
    <section class="mensaje-pantalla">
      <section class="tarjeta mensaje-tarjeta">
        <div class="mensaje-tarjeta__cabecera">
          <div>
            <span class="texto-cuerpo-s">Pedido #{pedido.numero}</span>
            <h2>Mensaje listo</h2>
          </div>
          <span class="importe">{formatearImporte(pedido.total)}</span>
        </div>
        <pre class="mensaje-contenido">{mensaje}</pre>
      </section>
      <div class="mensaje-acciones">
        <button type="button" class="boton-primario" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button>
        <button type="button" class="boton-secundario" disabled={!tieneTelefono} onClick={abrirWhatsApp}>Abrir WhatsApp</button>
      </div>
      {!tieneTelefono && <p class="texto-cuerpo-s mensaje-ayuda">Agregá un teléfono al pedido para abrir WhatsApp.</p>}
    </section>
  );
}
