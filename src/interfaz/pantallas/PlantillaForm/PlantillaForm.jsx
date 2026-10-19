/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { MARCADORES, cargarPlantilla, guardarPlantilla, obtenerPlantillaLocalAnterior, PLANTILLAS_INICIALES } from '../../../config/plantillas.js';
import { abrirDB } from '../../../persistencia/db.js';
import { useCambiosSinGuardar } from '../../../hooks/useCambiosSinGuardar.js';

const EJEMPLO = { cliente: 'Ana', numero: '24', fecha: '09/09/2026', detalle: '1 × Vela aromática — $ 8.300', total: '$ 8.300', pagado: '$ 3.000', saldo: '$ 5.300', montoPago: '$ 3.000', medioPago: 'Transferencia', motivo: 'Se registró por error' };

function previsualizar(texto) { return texto.replace(/\{(cliente|numero|fecha|detalle|total|pagado|saldo|montoPago|medioPago|motivo)\}/g, (_, clave) => EJEMPLO[clave]).replace(/\{nota\}/g, '').replace(/^.*\{nota\}.*$/gm, ''); }

export function PlantillaForm({ id }) {
  const [texto, setTexto] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);
  const [legado, setLegado] = useState(false);
  const { marcarGuardado } = useCambiosSinGuardar(texto, listo);
  useEffect(() => {
    let activo = true;
    abrirDB().then((db) => cargarPlantilla(db, id)).then((resultado) => {
      if (activo) { setTexto(resultado); setListo(true); setLegado(Boolean(obtenerPlantillaLocalAnterior(id))); }
    }).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [id]);
  function cambiar(valor) { setTexto(valor); setGuardado(false); }
  function insertar(marcador) { cambiar(`${texto}${texto && !texto.endsWith(' ') ? ' ' : ''}${marcador}`); }
  async function guardar() {
    setGuardando(true); setError(null);
    try { await guardarPlantilla(await abrirDB(), id, texto); marcarGuardado(); setGuardado(true); setLegado(false); }
    catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }
  if (!listo) return <p class={error ? 'aviso' : 'texto-cuerpo-s'}>{error ?? 'Cargando plantilla…'}</p>;

  return <section class="plantilla-pantalla">{legado && <p class="aviso aviso--info">Existe una plantilla anterior en este navegador. Revisá el texto y guardalo para sincronizarlo e incluirlo en los respaldos.</p>}{error && <p class="aviso" role="alert">{error}</p>}<label class="campo-entrada"><span>Plantilla de {id}</span><textarea disabled={guardando} rows="10" value={texto} onInput={(e) => cambiar(e.currentTarget.value)} /></label><div class="fila-chips plantilla-marcadores">{MARCADORES.map((marcador) => <button type="button" class="chip-seleccion" disabled={guardando} key={marcador} onClick={() => insertar(marcador)}>{marcador}</button>)}</div><section class="tarjeta plantilla-vista"><span class="etiqueta">Vista previa</span><pre>{previsualizar(texto)}</pre></section><div class="fila-botones"><button type="button" class="boton-secundario" disabled={guardando} onClick={() => cambiar(PLANTILLAS_INICIALES[id])}>Restaurar</button><button type="button" class="boton-primario" disabled={guardando || !texto.trim()} onClick={guardar}>{guardando ? 'Guardando…' : guardado ? 'Guardado' : 'Guardar'}</button></div></section>;
}
