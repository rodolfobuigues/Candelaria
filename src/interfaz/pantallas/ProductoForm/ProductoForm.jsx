/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, guardar, obtenerPorId } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { navegarA } from '../../enrutador.js';

const CATEGORIAS = [['VELA', 'Vela'], ['RECIPIENTE', 'Recipiente'], ['REPOSICION', 'Reposición']];
const NUMERICOS = ['ceraAltoPF', 'ceraBajoPF', 'pabilo', 'yeso', 'minutosManoObra', 'recipienteCosto', 'recipienteCantidad'];

const VACIO = { codigo: '', nombre: '', categoria: 'VELA', ceraAltoPF: 0, ceraBajoPF: 0, pabilo: 0, yeso: 0, minutosManoObra: 0, recipienteCosto: 0, recipienteCantidad: 0, heredaCostoDe: null, extras: [], activo: true };

export function ProductoForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ ...VACIO, codigo: id ?? '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let activo = true;
    abrirDB().then((db) => obtenerPorId(db, TIENDAS.PRODUCTOS, id)).then((producto) => {
      if (activo && producto) setForm({ ...VACIO, ...producto });
    }).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [id]);

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: NUMERICOS.includes(campo) ? Number(valor) || 0 : valor }));
  }

  async function guardarProducto() {
    if (!form.codigo.trim() || !form.nombre.trim()) return setError('El código y el nombre son obligatorios.');
    if (NUMERICOS.some((campo) => form[campo] < 0)) return setError('Las cantidades no pueden ser negativas.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      await guardar(db, TIENDAS.PRODUCTOS, { ...form, id: editando ? id : form.codigo.trim(), codigo: form.codigo.trim(), nombre: form.nombre.trim() });
      invalidarCatalogo(); navegarA(`producto/${editando ? id : form.codigo.trim()}`);
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <p class="texto-cuerpo-s">El costo y el precio se recalculan al guardar con los parámetros vigentes.</p>
      <div class="formulario-campos">
        <label class="campo-entrada"><span>Código *</span><input value={form.codigo} disabled={editando} onInput={(e) => cambiar('codigo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Nombre *</span><input value={form.nombre} onInput={(e) => cambiar('nombre', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Categoría</span><select value={form.categoria} onChange={(e) => cambiar('categoria', e.currentTarget.value)}>{CATEGORIAS.map(([idCategoria, etiqueta]) => <option value={idCategoria} key={idCategoria}>{etiqueta}</option>)}</select></label>
        <h2 class="texto-seccion formulario-subtitulo">Receta</h2>
        <label class="campo-entrada"><span>Cera alto PF (g)</span><input type="number" min="0" value={form.ceraAltoPF} onInput={(e) => cambiar('ceraAltoPF', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Cera bajo PF (g)</span><input type="number" min="0" value={form.ceraBajoPF} onInput={(e) => cambiar('ceraBajoPF', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Pabilo (unidad)</span><input type="number" min="0" value={form.pabilo} onInput={(e) => cambiar('pabilo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Yeso (g)</span><input type="number" min="0" value={form.yeso} onInput={(e) => cambiar('yeso', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Recipiente (costo)</span><input type="number" min="0" value={form.recipienteCosto} onInput={(e) => cambiar('recipienteCosto', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Recipiente (cantidad)</span><input type="number" min="0" value={form.recipienteCantidad} onInput={(e) => cambiar('recipienteCantidad', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Mano de obra (minutos)</span><input type="number" min="0" value={form.minutosManoObra} onInput={(e) => cambiar('minutosManoObra', e.currentTarget.value)} /></label>
      </div>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando} onClick={guardarProducto}>Guardar producto</button>
    </section>
  );
}
