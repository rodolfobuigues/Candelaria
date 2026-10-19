/** @jsx h */
import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, crear, actualizar, obtenerPorId, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { obtenerCatalogo } from '../../../persistencia/catalogoRepo.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { calcularCostoCombo, calcularIndicadores } from '../../../motor/calculo.js';
import { construirDesgloseCombo } from '../../../motor/desgloseCombo.js';
import { formatearImporte, formatearCostoUnitario } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';
import { GaleriaFotos } from '../../comun/GaleriaFotos.jsx';
import { guardarFotosEnStorage } from '../../../persistencia/fotosStorage.js';
import { supabaseConfigurado } from '../../../config/supabase.js';
import { construirCatalogoPublico, normalizarBusqueda, sugerirDescripcionComercial, sincronizarCatalogoPublico } from '../../../persistencia/catalogoPublicoRepo.js';
import { TarjetaCatalogo } from '../CatalogoPublico/CatalogoPublico.jsx';
import { useCambiosSinGuardar } from '../../../hooks/useCambiosSinGuardar.js';

function numeroTexto(numero, decimales = 1) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(numero);
}

export function ComboForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ id: id ?? crypto.randomUUID(), nombre: '', activo: true, nombreComercial: '', descripcionComercial: '', lineas: [], fotos: [] });
  const [opciones, setOpciones] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [preparandoFotos, setPreparandoFotos] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [contextoCalculo, setContextoCalculo] = useState(null);
  const [busquedaComponente, setBusquedaComponente] = useState('');
  const [guardadoPendientePublicar, setGuardadoPendientePublicar] = useState(false);
  const { marcarGuardado } = useCambiosSinGuardar(form, Boolean(contextoCalculo));

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const [productos, insumos, parametros, comboSeleccionado] = await Promise.all([
          obtenerTodos(db, TIENDAS.PRODUCTOS),
          obtenerTodos(db, TIENDAS.INSUMOS),
          obtenerParametrosVigentes(db),
          id ? obtenerPorId(db, TIENDAS.COMBOS, id) : Promise.resolve(null),
        ]);
        const catalogo = await obtenerCatalogo(db, parametros);
        if (!activo) return;
        setOpciones([...productos.map((item) => ({ ...item, tipo: 'PRODUCTO', etiqueta: `${item.nombre} (${item.codigo})` })), ...insumos.map((item) => ({ ...item, tipo: 'INSUMO', etiqueta: `${item.nombre} (${item.codigo})` }))]);
        setContextoCalculo({ productos: catalogo.productos, productosBase: productos, insumos, parametros });
        if (id) {
          const combo = comboSeleccionado;
          if (combo) {
            setForm({ id: combo.id, nombre: combo.nombre, activo: combo.activo !== false, nombreComercial: combo.nombreComercial ?? '', descripcionComercial: combo.descripcionComercial ?? '', lineas: combo.lineas, fotos: combo.fotos ?? [] });
          }
        }
      } catch (e) { if (activo) setError(e.message); }
    }
    cargar(); return () => { activo = false; };
  }, [id]);

  useEffect(() => {
    if (!contextoCalculo || form.lineas.length === 0) {
      setResumen(null);
      return;
    }
    try {
      const { productos, productosBase, insumos, parametros } = contextoCalculo;
      const productosPorId = new Map(productos.map((producto) => [String(producto.id), producto]));
      const insumosPorId = new Map(insumos.map((insumo) => [String(insumo.id), insumo]));
      const lineasConCosto = form.lineas.map((linea) => {
        const costoUnit = linea.tipo === 'PRODUCTO'
          ? productosPorId.get(String(linea.refId))?.costoProduccion
          : insumosPorId.get(String(linea.refId))?.montoCompra / insumosPorId.get(String(linea.refId))?.cantidadCompra;
        if (!Number.isFinite(costoUnit)) throw new Error(`No se pudo calcular el componente ${linea.refId}.`);
        return { ...linea, costoUnit };
      });
      const comboCalculado = calcularCostoCombo(lineasConCosto, parametros);
      const desglose = construirDesgloseCombo({ combo: form, productos, productosBase, insumos });
      setResumen({ combo: comboCalculado, indicadores: calcularIndicadores({ precio: comboCalculado.precioCombo, subtotal: comboCalculado.costoCombo, ...desglose }), ...desglose });
      setError(null);
    } catch (e) {
      setResumen(null);
      setError(e.message);
    }
  }, [contextoCalculo, form.lineas]);

  function agregarLinea() {
    const opcion = opciones[0];
    if (opcion) setForm((actual) => ({ ...actual, lineas: [...actual.lineas, { tipo: opcion.tipo, refId: opcion.id, cantidad: 1 }] }));
  }

  function cambiarLinea(indice, campo, valor) {
    const opcion = campo === 'refId' ? opciones.find((item) => `${item.tipo}:${item.id}` === valor) : null;
    setForm((actual) => ({ ...actual, lineas: actual.lineas.map((linea, posicion) => posicion === indice ? { ...linea, [campo]: campo === 'cantidad' ? Number(valor) || 0 : opcion?.id ?? valor, ...(opcion ? { tipo: opcion.tipo } : {}) } : linea) }));
  }

  async function guardarCombo() {
    if (guardando || preparandoFotos) return;
    if (!form.nombre.trim() || !resumen || form.lineas.length === 0 || form.lineas.some((linea) => !Number.isFinite(linea.cantidad) || linea.cantidad <= 0)) return setError('El nombre y al menos una línea válida son obligatorios. Revisá los componentes y su cálculo.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      const registro = { id: form.id, nombre: form.nombre.trim(), nombreComercial: form.nombreComercial.trim(), descripcionComercial: form.descripcionComercial.trim(), activo: form.activo, lineas: form.lineas, fotos: form.fotos };
      const conFotos = supabaseConfigurado ? await guardarFotosEnStorage(registro, 'combos') : registro;
      await (editando ? actualizar : crear)(db, TIENDAS.COMBOS, conFotos);
      marcarGuardado();
      invalidarCatalogo();
      setGuardadoPendientePublicar(true);
      try { await sincronizarCatalogoPublico(db); navegarA('productos'); }
      catch (e) { setError(`El combo está guardado. Queda pendiente publicar el catálogo: ${e.message}`); }
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  }

  async function reintentarPublicacion() {
    setGuardando(true); setError(null);
    try { await sincronizarCatalogoPublico(await abrirDB()); navegarA('productos'); }
    catch (e) { setError(`El combo sigue guardado. No se pudo publicar: ${e.message}`); }
    finally { setGuardando(false); }
  }

  return (
    <section class="formulario-pantalla">
      <fieldset class="formulario-campos formulario-sin-borde" disabled={guardadoPendientePublicar || guardando || preparandoFotos}>
        <label class="campo-entrada"><span>Nombre interno del combo *</span><input value={form.nombre} onInput={(e) => setForm({ ...form, nombre: e.currentTarget.value })} /></label>
        <label class="campo-entrada"><span>Código del combo</span><input value={form.id} disabled /></label>
        <h2 class="texto-seccion formulario-subtitulo">Componentes</h2>
        <label class="campo-entrada"><span>Buscar componente</span><input type="search" value={busquedaComponente} onInput={(e) => setBusquedaComponente(e.currentTarget.value)} placeholder="Nombre o código" /></label>
        {form.lineas.map((linea, indice) => (
          <div class="formulario-linea" key={`${indice}-${linea.refId}`}>
            <select aria-label={`Componente ${indice + 1}`} value={`${linea.tipo}:${linea.refId}`} onChange={(e) => cambiarLinea(indice, 'refId', e.currentTarget.value)}>{opciones.filter((opcion) => (opcion.id === linea.refId && opcion.tipo === linea.tipo) || normalizarBusqueda(opcion.etiqueta).includes(normalizarBusqueda(busquedaComponente))).map((opcion) => <option value={`${opcion.tipo}:${opcion.id}`} key={`${opcion.tipo}-${opcion.id}`}>{opcion.etiqueta}</option>)}</select>
            <input type="number" min="0.01" step="0.1" value={linea.cantidad} onInput={(e) => cambiarLinea(indice, 'cantidad', e.currentTarget.value)} aria-label="Cantidad del componente" />
            <button type="button" class="boton-texto" onClick={() => setForm({ ...form, lineas: form.lineas.filter((_, posicion) => posicion !== indice) })}>Quitar</button>
          </div>
        ))}
      </fieldset>
      {!guardadoPendientePublicar && <GaleriaFotos disabled={guardando} alProcesar={setPreparandoFotos} fotos={form.fotos} nombre={form.nombreComercial || form.nombre || 'combo'} cambiar={(fotos) => setForm((actual) => ({ ...actual, fotos }))} />}
      <fieldset class="tarjeta formulario-campos formulario-sin-borde" disabled={guardadoPendientePublicar || guardando || preparandoFotos}><h2 class="texto-seccion">Publicación comercial</h2><p class="texto-cuerpo-s">Describí lo que recibe el cliente. No incluyas cantidades de fabricación, costos ni mano de obra. Si dejás la descripción vacía, solo se mostrará el contenido de productos terminados.</p>
        <label class="campo-entrada"><span>Nombre comercial</span><input maxLength="160" value={form.nombreComercial} placeholder={form.nombre} onInput={(e) => setForm({ ...form, nombreComercial: e.currentTarget.value })} /></label>
        <button type="button" class="boton-secundario" disabled={!form.lineas.some((linea) => linea.tipo === 'PRODUCTO')} onClick={() => setForm({ ...form, nombreComercial: [...new Set(form.lineas.filter((linea) => linea.tipo === 'PRODUCTO').map((linea) => opciones.find((opcion) => opcion.tipo === 'PRODUCTO' && opcion.id === linea.refId)?.nombre).filter(Boolean))].join(' + ') })}>Proponer nombre a partir de los productos</button>
        <label class="campo-entrada"><span>Descripción comercial</span><textarea maxLength="1000" value={form.descripcionComercial} rows="4" onInput={(e) => setForm({ ...form, descripcionComercial: e.currentTarget.value })} /></label>
        <button type="button" class="boton-secundario" onClick={() => setForm({ ...form, descripcionComercial: sugerirDescripcionComercial(form, contextoCalculo?.productosBase ?? []) })}>Proponer contenido para revisar</button>
        <h3 class="texto-seccion">Vista previa del catálogo</h3>
        {resumen ? <TarjetaCatalogo vistaPrevia combo={construirCatalogoPublico({ productos: contextoCalculo.productosBase, combos: [{ ...form, precioCombo: resumen.combo.precioCombo }] }, [], contextoCalculo.parametros, { vistaPrevia: true })[0]} /> : <p class="texto-cuerpo-s">Agregá componentes válidos para ver la publicación.</p>}
        {form.fotos.some((foto) => !/^https:\/\//i.test(foto)) && <p class="texto-cuerpo-s">Las fotos nuevas se subirán a Storage al guardar para que puedan verse en el catálogo.</p>}
      </fieldset>
      {resumen && <><div class="ficha-producto__identidad combo-precio"><span class="etiqueta">Precio de venta</span><strong class="importe-l ficha-producto__precio">{formatearImporte(resumen.combo.precioCombo)}</strong></div><section class="tarjeta ficha-seccion"><h2 class="texto-seccion">Datos del combo</h2><h3 class="texto-seccion">Insumos necesarios</h3><ul class="lista ficha-lista">{resumen.insumos.map((insumo) => <li class="fila-lista" key={insumo.id}><div class="fila-lista__contenido"><strong class="nombre-truncado">{insumo.nombre}</strong><span class="texto-cuerpo-s fila-lista__codigo">Cantidad total: {numeroTexto(insumo.cantidad, 6)} {insumo.unidad}</span></div><span class="importe">{formatearCostoUnitario(insumo.costo)}</span></li>)}</ul><dl class="ficha-costos"><div><dt>Costo de componentes</dt><dd>{formatearImporte(resumen.materiales)}</dd></div><div><dt>Mano de obra · {numeroTexto(resumen.minutos, 0)} min</dt><dd>{formatearImporte(resumen.manoObra)}</dd></div></dl><div class="ficha-indicadores"><div class="indicador"><span class="etiqueta">Margen sobre costo</span><strong>{resumen.indicadores.margenSobreCosto === null ? 'No disponible' : numeroTexto(resumen.indicadores.margenSobreCosto * 100) + ' %'}</strong></div><div class="indicador"><span class="etiqueta">Peso mano de obra</span><strong>{resumen.indicadores.pesoManoObra === null ? 'No disponible' : numeroTexto(resumen.indicadores.pesoManoObra * 100) + ' %'}</strong></div><div class="indicador"><span class="etiqueta">Beneficio bruto</span><strong>{formatearImporte(resumen.indicadores.beneficioBruto)}</strong></div><div class="indicador"><span class="etiqueta">Beneficio neto</span><strong>{formatearImporte(resumen.indicadores.beneficioNeto)}</strong></div><div class="indicador"><span class="etiqueta">Minutos mano de obra</span><strong>{numeroTexto(resumen.minutos, 0)} min</strong></div></div></section></>}
      {!guardadoPendientePublicar && <button type="button" class="boton-secundario" disabled={guardando || preparandoFotos} onClick={agregarLinea}>Agregar componente</button>}
      {error && <p class="aviso">{error}</p>}
      {guardadoPendientePublicar ? <><button type="button" class="boton-primario" disabled={guardando} onClick={reintentarPublicacion}>Reintentar publicación</button><button type="button" class="boton-secundario" onClick={() => navegarA('productos')}>Volver a productos</button></> : <button type="button" class="boton-primario" disabled={guardando || preparandoFotos} onClick={guardarCombo}>{guardando ? 'Guardando…' : 'Guardar combo'}</button>}
    </section>
  );
}
