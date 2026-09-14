/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { obtenerPedido, guardarPedido } from '../../../persistencia/pedidosRepo.js';
import { registrarMensaje, calcularDerivados } from '../../../persistencia/pedidoLogica.js';
import { construirMensajePedido } from '../../../persistencia/mensajes.js';
import { formatearImporte } from '../../../config/formato.js';

const TITULOS = { confirmacion: 'Confirmación lista', pago: 'Mensaje de pago listo', entrega: 'Mensaje de entrega listo', recordatorio: 'Recordatorio listo' };

export function Mensaje({ id, tipo = 'confirmacion', pagoId = null }) {
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const mensaje = useMemo(() => pedido && construirMensajePedido(pedido, { tipo, pagoId }), [pedido, tipo, pagoId]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const resultado = await obtenerPedido(db, id);
        if (!resultado) throw new Error('No encontramos ese pedido.');
        const texto = construirMensajePedido(resultado, { tipo, pagoId });
        const idMensaje = `mensaje-${tipo}-${pagoId ?? resultado.id}`;
        const registrado = registrarMensaje(resultado, { id: idMensaje, fecha: new Date().toISOString(), texto, categoria: tipo });
        await guardarPedido(db, registrado);
        if (activo) setPedido({ ...registrado, ...calcularDerivados(registrado) });
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [id, tipo, pagoId]);

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
            <h2>{TITULOS[tipo] ?? 'Mensaje listo'}</h2>
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
