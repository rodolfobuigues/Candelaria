/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { MARCADORES, obtenerPlantilla, guardarPlantilla, PLANTILLAS_INICIALES } from '../../../config/plantillas.js';
import { navegarA } from '../../enrutador.js';

const EJEMPLO = { cliente: 'Ana', numero: '24', fecha: '09/09/2026', detalle: '1 × Vela aromática — $ 8.300', total: '$ 8.300', pagado: '$ 0', saldo: '$ 8.300' };

function previsualizar(texto) { return texto.replace(/\{(cliente|numero|fecha|detalle|total|pagado|saldo)\}/g, (_, clave) => EJEMPLO[clave]).replace(/\{nota\}/g, '').replace(/^.*\{nota\}.*$/gm, ''); }

export function PlantillaForm({ id }) {
  const [texto, setTexto] = useState(''); const [guardado, setGuardado] = useState(false);
  useEffect(() => setTexto(obtenerPlantilla(id)), [id]);
  function insertar(marcador) { setTexto((actual) => `${actual}${actual && !actual.endsWith(' ') ? ' ' : ''}${marcador}`); }
  function guardar() { guardarPlantilla(id, texto); setGuardado(true); setTimeout(() => setGuardado(false), 1500); }
  return <section class="plantilla-pantalla"><label class="campo-entrada"><span>Plantilla de {id}</span><textarea rows="10" value={texto} onInput={(e) => setTexto(e.currentTarget.value)} /></label><div class="fila-chips plantilla-marcadores">{MARCADORES.map((marcador) => <button type="button" class="chip-seleccion" key={marcador} onClick={() => insertar(marcador)}>{marcador}</button>)}</div><section class="tarjeta plantilla-vista"><span class="etiqueta">Vista previa</span><pre>{previsualizar(texto)}</pre></section><div class="fila-botones"><button type="button" class="boton-secundario" onClick={() => setTexto(PLANTILLAS_INICIALES[id])}>Restaurar</button><button type="button" class="boton-primario" onClick={guardar}>{guardado ? 'Guardado' : 'Guardar'}</button></div></section>;
}
