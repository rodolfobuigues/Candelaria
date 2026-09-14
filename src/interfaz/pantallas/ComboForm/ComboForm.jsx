/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, guardar, obtenerPorId, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { obtenerCatalogo } from '../../../persistencia/catalogoRepo.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { calcularIndicadores } from '../../../motor/calculo.js';
import { formatearImporte } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';
import { GaleriaFotos } from '../../comun/GaleriaFotos.jsx';

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

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const [productos, insumos, combos, parametros] = await Promise.all([obtenerTodos(db, TIENDAS.PRODUCTOS), obtenerTodos(db, TIENDAS.INSUMOS), obtenerTodos(db, TIENDAS.COMBOS), obtenerParametrosVigentes(db)]);
        const catalogo = await obtenerCatalogo(db, parametros);
        if (!activo) return;
        setOpciones([...productos.map((item) => ({ ...item, tipo: 'PRODUCTO', etiqueta: `${item.nombre} (${item.codigo})` })), ...insumos.map((item) => ({ ...item, tipo: 'INSUMO', etiqueta: `${item.nombre} (${item.codigo})` }))]);
        if (id) {
          const combo = combos.find((item) => item.id === id);
          if (combo) {
            setForm({ id: combo.id, nombre: combo.nombre, lineas: combo.lineas, fotos: combo.fotos ?? [] });
            const derivado = catalogo.combos.find((item) => item.id === id);
            const productosPorId = new Map(catalogo.productos.map((item) => [item.id, item]));
            const insumosPorId = new Map(insumos.map((item) => [item.id, item]));
            const desglose = combo.lineas.reduce((total, linea) => {
              const producto = linea.tipo === 'PRODUCTO' ? productosPorId.get(linea.refId) : null;
              const insumo = linea.tipo === 'INSUMO' ? insumosPorId.get(linea.refId) : null;
              const costoInsumo = insumo ? insumo.montoCompra / insumo.cantidadCompra : 0;
              return {
                materiales: total.materiales + (producto ? producto.materiales : costoInsumo) * linea.cantidad,
                manoObra: total.manoObra + (producto?.manoObra ?? 0) * linea.cantidad,
                minutos: total.minutos + (producto?.minutosManoObra ?? 0) * linea.cantidad,
                componentes: [...total.componentes, { nombre: producto?.nombre ?? insumo?.nombre ?? linea.refId, cantidad: linea.cantidad, costo: (producto ? producto.materiales : costoInsumo) * linea.cantidad }],
              };
            }, { materiales: 0, manoObra: 0, minutos: 0, componentes: [] });
            setResumen({ combo: derivado, indicadores: calcularIndicadores({ precio: derivado.precioCombo, subtotal: derivado.costoCombo, ...desglose }), ...desglose });
          }
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
      {resumen && <><div class="ficha-producto__identidad combo-precio"><span class="etiqueta">Precio de venta</span><strong class="importe-l ficha-producto__precio">{formatearImporte(resumen.combo.precioCombo)}</strong></div><section class="tarjeta ficha-seccion"><h2 class="texto-seccion">Datos del combo</h2><ul class="lista ficha-lista">{resumen.componentes.map((componente) => <li class="fila-lista" key={`${componente.nombre}-${componente.cantidad}`}><div class="fila-lista__contenido"><strong class="nombre-truncado">{componente.nombre}</strong><span class="texto-cuerpo-s fila-lista__codigo">Cantidad: {numeroTexto(componente.cantidad, 2)}</span></div><span class="importe">{formatearImporte(componente.costo)}</span></li>)}</ul><dl class="ficha-costos"><div><dt>Costo de componentes</dt><dd>{formatearImporte(resumen.materiales)}</dd></div><div><dt>Mano de obra · {numeroTexto(resumen.minutos, 0)} min</dt><dd>{formatearImporte(resumen.manoObra)}</dd></div></dl><div class="ficha-indicadores"><div class="indicador"><span class="etiqueta">Margen sobre costo</span><strong>{numeroTexto(resumen.indicadores.margenSobreCosto * 100)} %</strong></div><div class="indicador"><span class="etiqueta">Peso mano de obra</span><strong>{numeroTexto(resumen.indicadores.pesoManoObra * 100)} %</strong></div><div class="indicador"><span class="etiqueta">Beneficio bruto</span><strong>{formatearImporte(resumen.indicadores.beneficioBruto)}</strong></div><div class="indicador"><span class="etiqueta">Beneficio neto</span><strong>{formatearImporte(resumen.indicadores.beneficioNeto)}</strong></div><div class="indicador"><span class="etiqueta">Minutos mano de obra</span><strong>{numeroTexto(resumen.minutos, 0)} min</strong></div></div></section></>}
      <button type="button" class="boton-secundario" onClick={agregarLinea}>Agregar componente</button>
      {error && <p class="aviso">{error}</p>}
      <button type="button" class="boton-primario" disabled={guardando} onClick={guardarCombo}>Guardar combo</button>
    </section>
  );
}
