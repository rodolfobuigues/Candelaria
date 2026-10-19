/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, crear, actualizar, obtenerPorId, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { sincronizarCatalogoPublico } from '../../../persistencia/catalogoPublicoRepo.js';
import { navegarA } from '../../enrutador.js';

import { useCambiosSinGuardar } from '../../../hooks/useCambiosSinGuardar.js';
import { inferirRolInsumo, ROLES_INSUMOS_FIJOS } from '../../../config/insumosFijos.js';

const UNIDADES = ['g', 'kg', 'ml', 'unidad', 'hora'];

export function InsumoForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ codigo: id ?? '', nombre: '', categoria: '', unidad: 'g', montoCompra: '', cantidadCompra: '1', rolMotor: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [listo, setListo] = useState(!id);
  const [guardado, setGuardado] = useState(false);
  const [rolInicial, setRolInicial] = useState('');
  const bloqueado = guardando || guardado;
  const { marcarGuardado } = useCambiosSinGuardar(form, listo);
  useEffect(() => {
    if (!id) return undefined;
    let activo = true;
    abrirDB().then((db) => obtenerPorId(db, TIENDAS.INSUMOS, id)).then((insumo) => {
      if (!insumo) throw new Error('No encontramos ese insumo.');
      if (activo) { const rolMotor = inferirRolInsumo(insumo) ?? ''; setRolInicial(rolMotor); setForm({ ...insumo, rolMotor, montoCompra: String(insumo.montoCompra), cantidadCompra: String(insumo.cantidadCompra) }); setListo(true); }
    }).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [id]);

  function cambiar(campo, valor) {
    if (bloqueado) return;
    setGuardado(false);
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarInsumo() {
    if (bloqueado) return;
    const montoCompra = Number(form.montoCompra);
    const cantidadCompra = Number(form.cantidadCompra);
    if (!form.codigo.trim() || !form.nombre.trim()) return setError('El código y el nombre son obligatorios.');
    if (!Number.isFinite(montoCompra) || montoCompra < 0 || !Number.isFinite(cantidadCompra) || cantidadCompra <= 0) return setError('El monto no puede ser negativo y la cantidad debe ser mayor a cero.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      const insumos = await obtenerTodos(db, TIENDAS.INSUMOS);
      if (insumos.some((item) => item.id !== (editando ? id : null) && item.codigo === form.codigo.trim())) throw new Error('Ese código ya existe. Elegí otro; el insumo anterior conserva sus datos.');
      if (rolInicial && form.rolMotor !== rolInicial) throw new Error('Este rol mantiene recetas existentes. Conservá la asignación; podés cambiar el nombre sin alterar el rol.');
      if (form.rolMotor && insumos.some((item) => item.id !== id && inferirRolInsumo(item) === form.rolMotor)) throw new Error('Ese rol ya está asignado a otro insumo. Revisá la asignación antes de guardar.');
      await (editando ? actualizar : crear)(db, TIENDAS.INSUMOS, { ...form, id: editando ? id : form.codigo.trim(), codigo: form.codigo.trim(), nombre: form.nombre.trim(), categoria: form.categoria.trim(), unidad: form.unidad, montoCompra, cantidadCompra, rolMotor: form.rolMotor || null, activo: form.activo ?? true });
      marcarGuardado(); setGuardado(true); invalidarCatalogo();
      try { await sincronizarCatalogoPublico(db); } catch (e) { setError(`Insumo guardado. La publicación sigue pendiente: ${e.message}. Podés reparar los insumos y reintentar desde Ajustes.`); return; }
      navegarA('productos?solapa=insumos');
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  async function reintentarPublicacion() {
    if (guardando) return;
    setGuardando(true); setError(null);
    try { await sincronizarCatalogoPublico(await abrirDB()); navegarA('productos?solapa=insumos'); }
    catch (e) { setError(`Insumo guardado. La publicación sigue pendiente: ${e.message}. Podés volver sin perder los datos guardados.`); }
    finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <p class="texto-cuerpo-s">{editando ? 'Actualizá los datos del insumo.' : 'Cargá un nuevo insumo para usarlo en recetas y combos.'}</p>
      <div class="formulario-campos">
        <label class="campo-entrada"><span>Código *</span><input required maxLength="80" aria-invalid={error?.toLowerCase().includes('código') ? 'true' : undefined} value={form.codigo} disabled={editando || bloqueado} onInput={(e) => cambiar('codigo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Nombre *</span><input disabled={bloqueado} required maxLength="200" value={form.nombre} onInput={(e) => cambiar('nombre', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Categoría</span><input disabled={bloqueado} value={form.categoria} onInput={(e) => cambiar('categoria', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Rol en el cálculo</span><select disabled={bloqueado} value={form.rolMotor} onChange={(e) => cambiar('rolMotor', e.currentTarget.value)}><option value="">Insumo adicional</option>{ROLES_INSUMOS_FIJOS.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
        <p class="texto-cuerpo-s">El rol mantiene la receta al cambiar el nombre. Cada rol debe pertenecer a un solo insumo.</p>
        <label class="campo-entrada"><span>Unidad</span><select disabled={bloqueado} value={form.unidad} onChange={(e) => cambiar('unidad', e.currentTarget.value)}>{UNIDADES.map((unidad) => <option key={unidad}>{unidad}</option>)}</select></label>
        <label class="campo-entrada"><span>Monto de compra</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.montoCompra} onInput={(e) => cambiar('montoCompra', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Cantidad de compra</span><input disabled={bloqueado} type="number" min="0.01" step="any" value={form.cantidadCompra} onInput={(e) => cambiar('cantidadCompra', e.currentTarget.value)} /></label>
      </div>
      {error && <p class="aviso" role="alert">{error}</p>}
      {!guardado && <button type="button" class="boton-primario" disabled={guardando || !listo || guardado} onClick={guardarInsumo}>{guardando ? 'Guardando…' : guardado ? 'Insumo guardado' : 'Guardar insumo'}</button>}
      {guardado && <div class="fila-botones"><button type="button" class="boton-primario" disabled={guardando} onClick={reintentarPublicacion}>{guardando ? 'Publicando…' : 'Reintentar publicación'}</button><button type="button" class="boton-secundario" disabled={guardando} onClick={() => navegarA('productos?solapa=insumos')}>Volver al registro guardado</button></div>}
    </section>
  );
}
