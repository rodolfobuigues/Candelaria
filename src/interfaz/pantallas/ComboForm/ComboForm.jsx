/** @jsx h */
import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, guardar, obtenerPorId, obtenerTodos } from '../../../persistencia/db.js';
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

function nuevoId(combos) {
  const mayor = combos.reduce((maximo, combo) => Math.max(maximo, Number(combo.id) || 0), 0);
  return String(mayor + 1);
}

function numeroTexto(numero, decimales = 1) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(numero);
}

export function ComboForm({ id = null }) {
  const editando = Boolean(id);
  const [form, setForm] = useState({ id: id ?? '', nombre: 'vela aromatica', lineas: [], fotos: [] });
  const [opciones, setOpciones] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [contextoCalculo, setContextoCalculo] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const [productos, insumos, combos, parametros, comboSeleccionado] = await Promise.all([
          obtenerTodos(db, TIENDAS.PRODUCTOS),
          obtenerTodos(db, TIENDAS.INSUMOS),
          obtenerTodos(db, TIENDAS.COMBOS),
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
            setForm({ id: combo.id, nombre: combo.nombre, lineas: combo.lineas, fotos: combo.fotos ?? [] });
          }
        } else setForm((actual) => ({ ...actual, id: nuevoId(combos) }));
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
    setForm((actual) => ({ ...actual, lineas: actual.lineas.map((linea, posicion) => posicion === indice ? { ...linea, [campo]: campo === 'cantidad' ? Number(valor) || 0 : valor, ...(campo === 'refId' ? { tipo: opciones.find((opcion) => opcion.id === valor)?.tipo ?? linea.tipo } : {}) } : linea) }));
  }

  async function guardarCombo() {
    if (!form.nombre.trim() || form.lineas.length === 0 || form.lineas.some((linea) => linea.cantidad <= 0)) return setError('El nombre y al menos una línea válida son obligatorios.');
    setGuardando(true); setError(null);
    try {
      const db = await abrirDB();
      const registro = { id: form.id, nombre: form.nombre.trim(), activo: true, lineas: form.lineas, fotos: form.fotos };
      const conFotos = supabaseConfigurado ? await guardarFotosEnStorage(registro, 'combos') : registro;
      await guardar(db, TIENDAS.COMBOS, conFotos);
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
      {resumen && <><div class="ficha-producto__identidad combo-precio"><span class="etiqueta">Precio de venta</span><strong class="importe-l ficha-producto__precio">{formatearImporte(resumen.combo.precioCombo)}</strong></div><section class="tarjeta ficha-seccion"><h2 class="texto-seccion">Datos del combo</h2><h3 class="texto-seccion">Insumos necesarios</h3><ul class="lista ficha-lista">{resumen.insumos.map((insumo) => <li class="fila-lista" key={insumo.id}><div class="fila-lista__contenido"><strong class="nombre-truncado">{insumo.nombre}</strong><span class="texto-cuerpo-s fila-lista__codigo">Cantidad total: {numeroTexto(insumo.cantidad, 6)} {insumo.unidad}</span></div><span class="importe">{formatearCostoUnitario(insumo.costo)}</span></li>)}</ul><dl class="ficha-costos"><div><dt>Costo de componentes</dt><dd>{formatearImporte(resumen.materiales)}</dd></div><div><dt>Mano de obra · {numeroTexto(resumen.minutos, 0)} min</dt><dd>{formatearImporte(resumen.manoObra)}</dd></div></dl><div class="ficha-indicadores"><div class="indicador"><span class="etiqueta">Margen sobre costo</span><strong>{numeroTexto(resumen.indicadores.margenSobreCosto * 100)} %</strong></div><div class="indicador"><span class="etiqueta">Peso mano de obra</span><strong>{numeroTexto(resumen.indicadores.pesoManoObra * 100)} %</strong></div><div class="indicador"><span class="etiqueta">Beneficio bruto</span><strong>{formatearImporte(resumen.indicadores.beneficioBruto)}</strong></div><div class="indicador"><span class="etiqueta">Beneficio neto</span><strong>{formatearImporte(resumen.indicadores.beneficioNeto)}</strong></div><div class="indicador"><span class="etiqueta">Minutos mano de obra</span><strong>{numeroTexto(resumen.minutos, 0)} min</strong></div></div></section></>}
      <button type="button" class="boton-secundario" onClick={agregarLinea}>Agregar componente</button>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando} onClick={guardarCombo}>Guardar combo</button>
    </section>
  );
}
