/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, obtenerTodos, guardar } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { guardarParametros, obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { exportarRespaldo, importarRespaldo } from '../../../persistencia/respaldo.js';
import { leerXlsx } from '../../../persistencia/xlsxLectura.js';
import { navegarA } from '../../enrutador.js';

const CAMPOS = [
  ['beneficio', 'Beneficio', 0.01], ['factorGastos', 'Gastos fijos y desperdicio', 0.01], ['redondeo', 'Redondeo', 1],
  ['costoHoraManoObra', 'Mano de obra por hora', 1], ['porcentajeEsencia', 'Esencia (%)', 0.1], ['mlColorantePorGramoCera', 'Colorante (ml por g)', 0.00001], ['unidadesCocoPorGramoCera', 'Aceite de coco (unidad por g)', 0.00001],
];

export function Ajustes() {
  const [parametros, setParametros] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  useEffect(() => { abrirDB().then(obtenerParametrosVigentes).then(setParametros); }, []);
  async function guardarCambios() {
    const db = await abrirDB(); await guardarParametros(db, parametros); invalidarCatalogo(); setMensaje('Parámetros guardados. El catálogo se recalculará al volver a abrirlo.');
  }
  async function exportar() {
    const db = await abrirDB(); const respaldo = await exportarRespaldo(db); const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' }); const enlace = document.createElement('a'); enlace.href = URL.createObjectURL(blob); enlace.download = `respaldo-candelaria-${new Date().toISOString().slice(0, 10)}.json`; enlace.click(); URL.revokeObjectURL(enlace.href);
  }
  async function importar(evento) {
    const archivo = evento.currentTarget.files?.[0]; if (!archivo) return;
    try { const respaldo = JSON.parse(await archivo.text()); if (!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) return; const db = await abrirDB(); await importarRespaldo(db, respaldo); invalidarCatalogo(); setMensaje('Respaldo importado correctamente.'); } catch (e) { setMensaje(`No se pudo importar: ${e.message}`); } finally { evento.currentTarget.value = ''; }
  }
  function descargarCSV(nombre, filas) {
    const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
    const contenido = filas.map((fila) => fila.map(escapar).join(';')).join('\r\n');
    const enlace = document.createElement('a'); enlace.href = URL.createObjectURL(new Blob([`\ufeff${contenido}`], { type: 'text/csv;charset=utf-8' })); enlace.download = nombre; enlace.click(); URL.revokeObjectURL(enlace.href);
  }
  async function exportarCSV() {
    const db = await abrirDB();
    const [insumos, productos, combos] = await Promise.all([obtenerTodos(db, TIENDAS.INSUMOS), obtenerTodos(db, TIENDAS.PRODUCTOS), obtenerTodos(db, TIENDAS.COMBOS)]);
    descargarCSV('insumos-candelaria.csv', [['codigo', 'nombre', 'categoria', 'unidad', 'montoCompra', 'cantidadCompra'], ...insumos.map((item) => [item.codigo, item.nombre, item.categoria, item.unidad, item.montoCompra, item.cantidadCompra])]);
    descargarCSV('productos-candelaria.csv', [['codigo', 'nombre', 'categoria', 'ceraAltoPF', 'ceraBajoPF', 'pabilo', 'yeso', 'minutosManoObra', 'recipienteCosto', 'recipienteCantidad'], ...productos.map((item) => [item.codigo, item.nombre, item.categoria, item.ceraAltoPF, item.ceraBajoPF, item.pabilo, item.yeso, item.minutosManoObra, item.recipienteCosto, item.recipienteCantidad])]);
    descargarCSV('combos-candelaria.csv', [['id', 'nombre', 'lineas'], ...combos.map((item) => [item.id, item.nombre, JSON.stringify(item.lineas)])]);
    setMensaje('Se descargaron tres archivos CSV compatibles con Excel.');
  }
  function parsearCSV(texto) {
    const filas = []; let fila = []; let celda = ''; let entreComillas = false;
    for (let indice = 0; indice < texto.length; indice += 1) {
      const caracter = texto[indice];
      if (caracter === '"' && texto[indice + 1] === '"' && entreComillas) { celda += '"'; indice += 1; }
      else if (caracter === '"') entreComillas = !entreComillas;
      else if (caracter === ';' && !entreComillas) { fila.push(celda); celda = ''; }
      else if ((caracter === '\n' || caracter === '\r') && !entreComillas) { if (caracter === '\r' && texto[indice + 1] === '\n') indice += 1; fila.push(celda); if (fila.some(Boolean)) filas.push(fila); fila = []; celda = ''; }
      else celda += caracter;
    }
    if (celda || fila.length) { fila.push(celda); filas.push(fila); }
    const encabezados = filas.shift()?.map((valor) => valor.replace(/^\ufeff/, '')) ?? [];
    return filas.map((valores) => Object.fromEntries(encabezados.map((encabezado, indice) => [encabezado, valores[indice] ?? ''])));
  }
  async function importarCSV(evento, tipo) {
    const archivo = evento.currentTarget.files?.[0]; if (!archivo) return;
    try {
      const filas = parsearCSV(await archivo.text()); if (!filas.length) throw new Error('El archivo no contiene filas.');
      if (!confirm(`Se importarán ${filas.length} registros de ${tipo}. ¿Continuar?`)) return;
      const db = await abrirDB();
      if (tipo === 'insumos') for (const fila of filas) await guardar(db, TIENDAS.INSUMOS, { id: fila.codigo, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, unidad: fila.unidad, montoCompra: Number(fila.montoCompra), cantidadCompra: Number(fila.cantidadCompra), activo: true });
      if (tipo === 'productos') for (const fila of filas) await guardar(db, TIENDAS.PRODUCTOS, { id: fila.codigo, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, ceraAltoPF: Number(fila.ceraAltoPF), ceraBajoPF: Number(fila.ceraBajoPF), pabilo: Number(fila.pabilo), yeso: Number(fila.yeso), minutosManoObra: Number(fila.minutosManoObra), recipienteCosto: Number(fila.recipienteCosto), recipienteCantidad: Number(fila.recipienteCantidad), heredaCostoDe: null, extras: [], activo: true });
      if (tipo === 'combos') for (const fila of filas) await guardar(db, TIENDAS.COMBOS, { id: fila.id, nombre: fila.nombre, lineas: JSON.parse(fila.lineas), activo: true });
      invalidarCatalogo(); setMensaje(`Se importaron ${filas.length} registros de ${tipo}.`);
    } catch (e) { setMensaje(`No se pudo importar ${tipo}: ${e.message}`); } finally { evento.currentTarget.value = ''; }
  }
  async function revisarExcel(evento) {
    const archivo = evento.currentTarget.files?.[0]; if (!archivo) return;
    try { const libro = await leerXlsx(archivo); const resumen = libro.hojas.map((hoja) => `${hoja.nombre}: ${Math.max(hoja.filas.length - 1, 0)} filas`).join(' · '); setMensaje(`Planilla leída correctamente. ${resumen}`); } catch (e) { setMensaje(`No se pudo leer la planilla: ${e.message}`); } finally { evento.currentTarget.value = ''; }
  }
  if (!parametros) return <p class="texto-cuerpo-s">Cargando ajustes…</p>;
  return <section class="ajustes-pantalla">
    <section class="ajustes-seccion"><h2 class="texto-seccion">Parámetros de cálculo</h2><div class="ajustes-campos">{CAMPOS.map(([id, etiqueta, paso]) => <label class="campo-entrada" key={id}><span>{etiqueta}</span><input type="number" step={paso} value={parametros[id]} onInput={(e) => setParametros({ ...parametros, [id]: Number(e.currentTarget.value) })} /></label>)}</div><p class="texto-cuerpo-s">Cambiar estos valores recalcula el catálogo, pero no modifica los pedidos ya tomados.</p><button type="button" class="boton-primario" onClick={guardarCambios}>Guardar parámetros</button></section>
    <section class="ajustes-seccion"><h2 class="texto-seccion">Mensajes</h2>{['confirmacion', 'pago', 'recordatorio'].map((id) => <button type="button" class="fila-ajuste" key={id} onClick={() => navegarA(`plantilla/${id}`)}><span>{id[0].toUpperCase() + id.slice(1)}</span><span>›</span></button>)}</section>
    {mensaje && <p class="aviso aviso--info">{mensaje}</p>}
    <section class="ajustes-seccion"><h2 class="texto-seccion">Datos</h2><button type="button" class="fila-ajuste" onClick={exportar}><span>Respaldo</span><span>Descargar JSON</span></button><label class="fila-ajuste"><span>Importar respaldo JSON</span><input type="file" accept="application/json,.json" onChange={importar} /></label><button type="button" class="fila-ajuste" onClick={exportarCSV}><span>Exportar para Excel</span><span>CSV</span></button><label class="fila-ajuste"><span>Revisar planilla Excel</span><input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" onChange={revisarExcel} /></label><label class="fila-ajuste"><span>Importar insumos CSV</span><input type="file" accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'insumos')} /></label><label class="fila-ajuste"><span>Importar productos CSV</span><input type="file" accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'productos')} /></label><label class="fila-ajuste"><span>Importar combos CSV</span><input type="file" accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'combos')} /></label></section>
  </section>;
}
