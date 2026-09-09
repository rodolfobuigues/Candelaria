/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { guardarPedido, obtenerPedido } from '../../../persistencia/pedidosRepo.js';
import { registrarPago } from '../../../persistencia/pedidoLogica.js';
import { formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

const MEDIOS = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO'];

function idNuevo() {
  return `pago-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export function RegistroPago({ id }) {
  const [pedido, setPedido] = useState(null);
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState(MEDIOS[0]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const resultado = await obtenerPedido(db, id);
        if (!resultado) throw new Error('No encontramos ese pedido.');
        if (activo) {
          setPedido(resultado);
          setMonto(String(resultado.saldo));
        }
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [id]);

  async function guardar() {
    const montoNumerico = Number(monto);
    if (!pedido || !Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError('Ingresá un monto mayor a cero.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const fecha = new Date().toISOString();
      const actualizado = registrarPago(pedido, { id: idNuevo(), fecha, monto: montoNumerico, medio });
      const db = await abrirDB();
      await guardarPedido(db, actualizado);
      navegarA(`pedido/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  if (error && !pedido) return <p class="aviso">{error}</p>;
  if (!pedido) return <p class="texto-cuerpo-s">Cargando saldo…</p>;

  return (
    <section class="registro-pago-pantalla">
      <section class="tarjeta registro-pago-resumen">
        <span class="texto-cuerpo-s">Pedido #{pedido.numero} · {pedido.clienteNombre}</span>
        <strong class="importe-l">{formatearImporte(pedido.saldo)}</strong>
        <span class="texto-cuerpo-s">Saldo pendiente</span>
      </section>
      <section class="registro-pago-form">
        <label class="campo-entrada">
          <span>Monto</span>
          <input type="number" min="1" max={pedido.saldo} step="1" value={monto} onInput={(e) => setMonto(e.currentTarget.value)} />
        </label>
        <label class="campo-entrada">
          <span>Medio de pago</span>
          <select value={medio} onChange={(e) => setMedio(e.currentTarget.value)}>
            {MEDIOS.map((opcion) => <option value={opcion} key={opcion}>{opcion}</option>)}
          </select>
        </label>
      </section>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando || Number(monto) <= 0} onClick={guardar}>Guardar pago</button>
    </section>
  );
}
