/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, guardar } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { navegarA } from '../../enrutador.js';

const UNIDADES = ['g', 'kg', 'ml', 'unidad', 'hora'];

export function InsumoForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ codigo: id ?? '', nombre: '', categoria: '', unidad: 'g', montoCompra: '', cantidadCompra: '1' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let activo = true;
    abrirDB().then((db) => new Promise((resolve, reject) => {
      const solicitud = db.transaction(TIENDAS.INSUMOS, 'readonly').objectStore(TIENDAS.INSUMOS).get(id);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    })).then((insumo) => {
      if (activo && insumo) setForm({ ...insumo, montoCompra: String(insumo.montoCompra), cantidadCompra: String(insumo.cantidadCompra) });
    }).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [id]);

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarInsumo() {
    const montoCompra = Number(form.montoCompra);
    const cantidadCompra = Number(form.cantidadCompra);
    if (!form.codigo.trim() || !form.nombre.trim()) return setError('El código y el nombre son obligatorios.');
    if (!Number.isFinite(montoCompra) || montoCompra < 0 || !Number.isFinite(cantidadCompra) || cantidadCompra <= 0) return setError('El monto no puede ser negativo y la cantidad debe ser mayor a cero.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      await guardar(db, TIENDAS.INSUMOS, { id: editando ? id : form.codigo.trim(), codigo: form.codigo.trim(), nombre: form.nombre.trim(), categoria: form.categoria.trim(), unidad: form.unidad, montoCompra, cantidadCompra, activo: true });
      invalidarCatalogo(); navegarA('productos');
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <p class="texto-cuerpo-s">{editando ? 'Actualizá los datos del insumo.' : 'Cargá un nuevo insumo para usarlo en recetas y combos.'}</p>
      <div class="formulario-campos">
        <label class="campo-entrada"><span>Código *</span><input value={form.codigo} disabled={editando} onInput={(e) => cambiar('codigo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Nombre *</span><input value={form.nombre} onInput={(e) => cambiar('nombre', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Categoría</span><input value={form.categoria} onInput={(e) => cambiar('categoria', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Unidad</span><select value={form.unidad} onChange={(e) => cambiar('unidad', e.currentTarget.value)}>{UNIDADES.map((unidad) => <option key={unidad}>{unidad}</option>)}</select></label>
        <label class="campo-entrada"><span>Monto de compra</span><input type="number" min="0" value={form.montoCompra} onInput={(e) => cambiar('montoCompra', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Cantidad de compra</span><input type="number" min="0.01" value={form.cantidadCompra} onInput={(e) => cambiar('cantidadCompra', e.currentTarget.value)} /></label>
      </div>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando} onClick={guardarInsumo}>Guardar insumo</button>
    </section>
  );
}
