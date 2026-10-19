/** @jsx h */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { abrirDB } from '../../../persistencia/db.js';
import { guardarPedido, obtenerPedido } from '../../../persistencia/pedidosRepo.js';
import { registrarPago } from '../../../persistencia/pedidoLogica.js';
import { formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

import { useCambiosSinGuardar } from '../../../hooks/useCambiosSinGuardar.js';

const MEDIOS = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO'];

function idNuevo() {
  return `pago-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export function RegistroPago({ id, origen = 'pedidos', filtroOrigen = null }) {
  const pagoIdRef = useRef(idNuevo());
  const [pedido, setPedido] = useState(null);
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState(MEDIOS[0]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const { marcarGuardado } = useCambiosSinGuardar({ monto, medio }, Boolean(pedido));
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
    if (guardando) return;
    const montoNumerico = Number(monto);
    if (!pedido || !Number.isFinite(montoNumerico) || montoNumerico <= 0 || montoNumerico > pedido.saldo) {
      setError('Ingresá un monto mayor a cero y menor o igual al saldo pendiente.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const fecha = new Date().toISOString();
      const pagoId = pagoIdRef.current;
      const actualizado = registrarPago(pedido, { id: pagoId, fecha, monto: montoNumerico, medio });
      const db = await abrirDB();
      await guardarPedido(db, actualizado);
      marcarGuardado();
      navegarA(`mensaje/${id}?tipo=pago&pagoId=${encodeURIComponent(pagoId)}&origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`);
    } catch (e) {
      setError(e.message);
      try {
        const vigente = await obtenerPedido(await abrirDB(), id);
        if (vigente) {
          setPedido(vigente);
          if (vigente.pagos.some((pago) => pago.id === pagoIdRef.current)) { marcarGuardado(); navegarA(`mensaje/${id}?tipo=pago&pagoId=${encodeURIComponent(pagoIdRef.current)}&origen=${encodeURIComponent(origen)}${filtroOrigen ? `&filtro=${encodeURIComponent(filtroOrigen)}` : ''}`); }
        }
      } catch { /* Se conserva el monto para reintentar con la misma identidad. */ }
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
          <input disabled={guardando} type="number" min="1" max={pedido.saldo} step="1" value={monto} onInput={(e) => setMonto(e.currentTarget.value)} />
        </label>
        <label class="campo-entrada">
          <span>Medio de pago</span>
          <select disabled={guardando} value={medio} onChange={(e) => setMedio(e.currentTarget.value)}>
            {MEDIOS.map((opcion) => <option value={opcion} key={opcion}>{opcion}</option>)}
          </select>
        </label>
      </section>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando || Number(monto) <= 0} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar pago'}</button>
    </section>
  );
}
