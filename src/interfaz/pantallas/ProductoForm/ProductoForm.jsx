/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB, crear, actualizar, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { calcularCatalogoDesdeDatos, invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { navegarA } from '../../enrutador.js';
import { GaleriaFotos, VisorFotos } from '../../comun/GaleriaFotos.jsx';
import { guardarFotosEnStorage } from '../../../persistencia/fotosStorage.js';
import { supabaseConfigurado } from '../../../config/supabase.js';
import { sincronizarCatalogoPublico } from '../../../persistencia/catalogoPublicoRepo.js';

import { useCambiosSinGuardar } from '../../../hooks/useCambiosSinGuardar.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { formatearImporte } from '../../../config/formato.js';
import { validarRegistro } from '../../../persistencia/validacionDominio.js';
import { sugerirCodigoProducto } from '../../formularios.js';

const CATEGORIAS = [['VELA', 'Vela'], ['RECIPIENTE', 'Recipiente'], ['REPOSICION', 'Reposición']];
const NUMERICOS = ['ceraAltoPF', 'ceraBajoPF', 'pabilo', 'yeso', 'minutosManoObra', 'recipienteCosto', 'recipienteCantidad'];

const VACIO = { codigo: '', nombre: '', categoria: 'VELA', ceraAltoPF: 0, ceraBajoPF: 0, pabilo: 0, yeso: 0, minutosManoObra: 0, recipienteCosto: 0, recipienteCantidad: 0, heredaCostoDe: null, extras: [], fotos: [], activo: true };

export function ProductoForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ ...VACIO, codigo: id ?? '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [preparandoFotos, setPreparandoFotos] = useState(false);

  const [contexto, setContexto] = useState(null);
  const [listo, setListo] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const bloqueado = guardando || guardado;
  const { marcarGuardado } = useCambiosSinGuardar(form, listo);
  useEffect(() => {
    let activo = true;
    async function cargar() {
      const db = await abrirDB();
      const [productos, insumos, parametros] = await Promise.all([obtenerTodos(db, TIENDAS.PRODUCTOS), obtenerTodos(db, TIENDAS.INSUMOS), obtenerParametrosVigentes(db)]);
      const duplicar = new URLSearchParams(globalThis.location.hash.split('?')[1] ?? '').get('duplicar');
      const producto = id ? productos.find((item) => item.id === id) : duplicar ? productos.find((item) => item.id === duplicar) : null;
      if (id && !producto) throw new Error('No encontramos ese producto.');
      if (activo) {
        setContexto({ productos, insumos, parametros });
        setForm(producto ? { ...VACIO, ...producto, ...(duplicar && !id ? { id: undefined, codigo: sugerirCodigoProducto(productos, producto.categoria), nombre: `${producto.nombre} (copia)`, fotos: [] } : {}) } : { ...VACIO, codigo: sugerirCodigoProducto(productos, 'VELA') });
        setListo(true);
      }
    }
    cargar().catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [id]);
  const calculo = useMemo(() => {
    if (!contexto) return {};
    try {
      const candidato = { ...form, id: id ?? '__vista_previa__' };
      const productos = [...contexto.productos.filter((item) => item.id !== id), candidato];
      const catalogo = calcularCatalogoDesdeDatos({ insumos: contexto.insumos, productos, combos: [] }, contexto.parametros);
      return { producto: catalogo.productos.find((item) => item.id === candidato.id) };
    } catch (e) { return { error: e.message }; }
  }, [form, contexto, id]);

  function cambiar(campo, valor) {
    if (bloqueado) return;
    setGuardado(false);
    setForm((actual) => ({ ...actual, [campo]: NUMERICOS.includes(campo) ? Number(valor) : valor, ...(!editando && campo === 'categoria' ? { codigo: sugerirCodigoProducto(contexto?.productos ?? [], valor) } : {}) }));
  }

  async function guardarProducto() {
    if (bloqueado || preparandoFotos) return;
    if (!form.codigo.trim() || !form.nombre.trim()) return setError('El código y el nombre son obligatorios.');
    if (NUMERICOS.some((campo) => form[campo] < 0)) return setError('Las cantidades no pueden ser negativas.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      const registro = { ...form, id: editando ? id : form.codigo.trim(), codigo: form.codigo.trim(), nombre: form.nombre.trim() };
      validarRegistro(TIENDAS.PRODUCTOS, registro);
      if (contexto.productos.some((item) => item.id !== (editando ? id : null) && item.codigo === registro.codigo)) throw new Error('Ese código ya existe. Elegí otro; el producto anterior conserva sus datos.');
      if (registro.extras.some((extra) => !contexto.insumos.some((insumo) => insumo.id === extra.insumoId))) throw new Error('Elegí un insumo existente para cada extra.');
      if (calculo.error) throw new Error(`No se puede calcular el precio: ${calculo.error}`);
      const conFotos = supabaseConfigurado ? await guardarFotosEnStorage(registro, 'productos') : registro;
      await (editando ? actualizar : crear)(db, TIENDAS.PRODUCTOS, conFotos);
      marcarGuardado(); setGuardado(true); invalidarCatalogo();
      try { await sincronizarCatalogoPublico(db); } catch (e) { setError(`Producto guardado. La publicación sigue pendiente: ${e.message}. Podés reintentar desde Ajustes.`); return; }
      navegarA(`producto/${encodeURIComponent(editando ? id : form.codigo.trim())}`);
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  async function reintentarPublicacion() {
    if (guardando) return;
    setGuardando(true); setError(null);
    try { await sincronizarCatalogoPublico(await abrirDB()); navegarA(`producto/${encodeURIComponent(id ?? form.codigo.trim())}`); }
    catch (e) { setError(`Producto guardado. La publicación sigue pendiente: ${e.message}. Podés volver sin perder los datos guardados.`); }
    finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <p class="texto-cuerpo-s">El costo y el precio se actualizan mientras editás la receta con los parámetros vigentes.</p>
      <div class="formulario-campos">
        <label class="campo-entrada"><span>Código *</span><input required maxLength="80" aria-invalid={error?.toLowerCase().includes('código') ? 'true' : undefined} value={form.codigo} disabled={editando || bloqueado} onInput={(e) => cambiar('codigo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Nombre *</span><input disabled={bloqueado} required maxLength="200" value={form.nombre} onInput={(e) => cambiar('nombre', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Categoría</span><select disabled={bloqueado} value={form.categoria} onChange={(e) => cambiar('categoria', e.currentTarget.value)}>{CATEGORIAS.map(([idCategoria, etiqueta]) => <option value={idCategoria} key={idCategoria}>{etiqueta}</option>)}</select></label>
        <h2 class="texto-seccion formulario-subtitulo">Receta</h2>
        <label class="campo-entrada"><span>Cera alto PF (g)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.ceraAltoPF} onInput={(e) => cambiar('ceraAltoPF', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Cera bajo PF (g)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.ceraBajoPF} onInput={(e) => cambiar('ceraBajoPF', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Pabilo (unidad)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.pabilo} onInput={(e) => cambiar('pabilo', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Yeso (g)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.yeso} onInput={(e) => cambiar('yeso', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Recipiente (costo)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.recipienteCosto} onInput={(e) => cambiar('recipienteCosto', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Recipiente (cantidad)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.recipienteCantidad} onInput={(e) => cambiar('recipienteCantidad', e.currentTarget.value)} /></label>
        <label class="campo-entrada"><span>Mano de obra (minutos)</span><input disabled={bloqueado} type="number" min="0" step="any" value={form.minutosManoObra} onInput={(e) => cambiar('minutosManoObra', e.currentTarget.value)} /></label>
      </div>
      <section class="formulario-extras ficha-seccion">
        <h2 class="texto-seccion">Insumos extra</h2>
        {(form.extras ?? []).map((extra, indice) => <div class="formulario-extra" key={indice}>
          <label class="campo-entrada"><span>Insumo extra {indice + 1}</span><select disabled={bloqueado} value={extra.insumoId} onChange={(e) => cambiar('extras', form.extras.map((item, i) => i === indice ? { ...item, insumoId: e.currentTarget.value } : item))}><option value="">Elegir insumo</option>{contexto?.insumos.map((insumo) => <option value={insumo.id} key={insumo.id}>{insumo.nombre} ({insumo.unidad})</option>)}</select></label>
          <label class="campo-entrada"><span>Cantidad ({contexto?.insumos.find((item) => item.id === extra.insumoId)?.unidad ?? 'unidad del insumo'})</span><input disabled={bloqueado} type="number" min="0.001" step="any" value={extra.cantidad} onInput={(e) => cambiar('extras', form.extras.map((item, i) => i === indice ? { ...item, cantidad: Number(e.currentTarget.value) } : item))} /></label>
          <button type="button" class="boton-secundario" disabled={bloqueado} onClick={() => cambiar('extras', form.extras.filter((_, i) => i !== indice))}>Quitar extra {indice + 1}</button>
        </div>)}
        <button type="button" class="boton-secundario" disabled={!listo || bloqueado} onClick={() => cambiar('extras', [...form.extras, { insumoId: '', cantidad: 1 }])}>Agregar insumo extra</button>
      </section>
      <section class="tarjeta producto-precio-vivo" aria-live="polite"><h2 class="texto-seccion">Costo y precio en vivo</h2>{calculo.producto && <dl><div><dt>Costo de producción</dt><dd>{formatearImporte(calculo.producto.costoProduccion)}</dd></div><div><dt>Precio de venta</dt><dd class="importe-l">{formatearImporte(calculo.producto.precio)}</dd></div></dl>}{calculo.error && <p class="aviso">No se puede calcular: {calculo.error}</p>}</section>
      {guardado ? <VisorFotos fotos={form.fotos} nombre={form.nombre} /> : <GaleriaFotos fotos={form.fotos} nombre={form.nombre} disabled={guardando} alProcesar={setPreparandoFotos} cambiar={(fotos) => cambiar('fotos', fotos)} />}
      {error && <p class="aviso" role="alert">{error}</p>}
      {!guardado && <button type="button" class="boton-primario" disabled={guardando || preparandoFotos || !listo || guardado || Boolean(calculo.error)} onClick={guardarProducto}>{guardando ? 'Guardando…' : preparandoFotos ? 'Preparando fotos…' : guardado ? 'Producto guardado' : 'Guardar producto'}</button>}
      {guardado && <div class="fila-botones"><button type="button" class="boton-primario" disabled={guardando} onClick={reintentarPublicacion}>{guardando ? 'Publicando…' : 'Reintentar publicación'}</button><button type="button" class="boton-secundario" disabled={guardando} onClick={() => navegarA(`producto/${encodeURIComponent(id ?? form.codigo.trim())}`)}>Volver al registro guardado</button></div>}
    </section>
  );
}
