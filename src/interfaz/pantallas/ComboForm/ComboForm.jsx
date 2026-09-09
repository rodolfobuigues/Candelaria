/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, guardar, obtenerPorId, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { navegarA } from '../../enrutador.js';
import { GaleriaFotos } from '../../comun/GaleriaFotos.jsx';

function nuevoId(combos) {
  const mayor = combos.reduce((maximo, combo) => Math.max(maximo, Number(combo.id) || 0), 0);
  return String(mayor + 1);
}

export function ComboForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ id: id ?? '', nombre: 'vela aromatica', lineas: [], fotos: [] });
  const [opciones, setOpciones] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const [productos, insumos, combos] = await Promise.all([obtenerTodos(db, TIENDAS.PRODUCTOS), obtenerTodos(db, TIENDAS.INSUMOS), obtenerTodos(db, TIENDAS.COMBOS)]);
        if (!activo) return;
        setOpciones([...productos.map((item) => ({ ...item, tipo: 'PRODUCTO', etiqueta: `${item.nombre} (${item.codigo})` })), ...insumos.map((item) => ({ ...item, tipo: 'INSUMO', etiqueta: `${item.nombre} (${item.codigo})` }))]);
        if (id) {
          const combo = combos.find((item) => item.id === id);
          if (combo) setForm({ id: combo.id, nombre: combo.nombre, lineas: combo.lineas, fotos: combo.fotos ?? [] });
        } else setForm((actual) => ({ ...actual, id: nuevoId(combos) }));
      } catch (e) { if (activo) setError(e.message); }
    }
    cargar(); return () => { activo = false; };
  }, [id]);

  function agregarLinea() {
    const opcion = opciones[0];
    if (opcion) setForm((actual) => ({ ...actual, lineas: [...actual.lineas, { tipo: opcion.tipo, refId: opcion.id, cantidad: 1 }] }));
  }

  function cambiarLinea(indice, campo, valor) {
    setForm((actual) => ({ ...actual, lineas: actual.lineas.map((linea, posicion) => posicion === indice ? { ...linea, [campo]: campo === 'cantidad' ? Number(valor) || 0 : valor, ...(campo === 'refId' ? { tipo: opciones.find((opcion) => opcion.id === valor)?.tipo ?? linea.tipo } : {}) } : linea) }));
  }

  async function guardarCombo() {
    if (!form.nombre.trim() || form.lineas.length === 0 || form.lineas.some((linea) => linea.cantidad <= 0)) return setError('El nombre y al menos una línea válida son obligatorios.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      await guardar(db, TIENDAS.COMBOS, { id: form.id, nombre: form.nombre.trim(), activo: true, lineas: form.lineas, fotos: form.fotos });
      invalidarCatalogo(); navegarA('productos');
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <div class="formulario-campos">
        <label class="campo-entrada"><span>Nombre del combo *</span><input value={form.nombre} onInput={(e) => setForm({ ...form, nombre: e.currentTarget.value })} /></label>
        <label class="campo-entrada"><span>Código del combo</span><input value={form.id} disabled /></label>
        <h2 class="texto-seccion formulario-subtitulo">Componentes</h2>
        {form.lineas.map((linea, indice) => (
          <div class="formulario-linea" key={`${indice}-${linea.refId}`}>
            <select value={linea.refId} onChange={(e) => cambiarLinea(indice, 'refId', e.currentTarget.value)}>{opciones.map((opcion) => <option value={opcion.id} key={`${opcion.tipo}-${opcion.id}`}>{opcion.etiqueta}</option>)}</select>
            <input type="number" min="0.01" step="0.1" value={linea.cantidad} onInput={(e) => cambiarLinea(indice, 'cantidad', e.currentTarget.value)} aria-label="Cantidad del componente" />
            <button type="button" class="boton-texto" onClick={() => setForm({ ...form, lineas: form.lineas.filter((_, posicion) => posicion !== indice) })}>Quitar</button>
          </div>
        ))}
      </div>
      <GaleriaFotos fotos={form.fotos} cambiar={(fotos) => setForm((actual) => ({ ...actual, fotos }))} />
      <button type="button" class="boton-secundario" onClick={agregarLinea}>Agregar componente</button>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando} onClick={guardarCombo}>Guardar combo</button>
    </section>
  );
}
