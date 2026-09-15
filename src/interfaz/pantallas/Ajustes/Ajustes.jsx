/** @jsx h */
import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { abrirDB, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { guardarParametros, obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { invalidarCatalogo } from '../../../persistencia/catalogoRepo.js';
import { exportarRespaldo, importarRespaldo, validarRespaldo } from '../../../persistencia/respaldo.js';
import { exportarExcel, revisarExcel as revisarArchivoExcel, aplicarRevisionExcel } from '../../../persistencia/excelRepo.js';
import { prepararRevisionCSV } from '../../../persistencia/excelCSV.js';
import { RevisionExcel } from '../../comun/RevisionExcel.jsx';
import { supabase, supabaseConfigurado } from '../../../config/supabase.js';
import { migrarFotosCatalogo, revisarMigracionFotos } from '../../../persistencia/fotosStorage.js';
import { sincronizarCatalogoPublico } from '../../../persistencia/catalogoPublicoRepo.js';
import { navegarA } from '../../enrutador.js';

const CAMPOS = [
  ['beneficio', 'Beneficio', 0.01], ['factorGastos', 'Gastos fijos y desperdicio', 0.01], ['redondeo', 'Redondeo', 1],
  ['costoHoraManoObra', 'Mano de obra por hora', 1], ['porcentajeEsencia', 'Esencia (%)', 0.1], ['mlColorantePorGramoCera', 'Colorante (ml por g)', 0.00001], ['unidadesCocoPorGramoCera', 'Aceite de coco (unidad por g)', 0.00001],
];

function descargarRespaldoJSON(respaldo, prefijo = 'respaldo-candelaria') {
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${prefijo}-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.json`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function Ajustes() {
  const [parametros, setParametros] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [revision, setRevision] = useState(null);
  const [ocupadoExcel, setOcupadoExcel] = useState(false);
  const [conteos, setConteos] = useState(null);
  const [revisionFotos, setRevisionFotos] = useState(null);
  const [migrandoFotos, setMigrandoFotos] = useState(false);
  const [progresoFotos, setProgresoFotos] = useState(null);
  useEffect(() => { abrirDB().then(obtenerParametrosVigentes).then(setParametros); }, []);
  async function actualizarConteos() {
    const db = await abrirDB();
    const [insumos, productos, combos] = await Promise.all([
      obtenerTodos(db, TIENDAS.INSUMOS), obtenerTodos(db, TIENDAS.PRODUCTOS), obtenerTodos(db, TIENDAS.COMBOS),
    ]);
    setConteos({ insumos: insumos.length, productos: productos.length, combos: combos.length });
  }
  useEffect(() => { actualizarConteos().catch((e) => setMensaje(`No se pudo consultar el catálogo: ${e.message}`)); }, []);
  async function guardarCambios() {
    const db = await abrirDB(); await guardarParametros(db, parametros); invalidarCatalogo(); await sincronizarCatalogoPublico(db); setMensaje('Parámetros guardados. El catálogo público también fue actualizado.');
  }
  async function cerrarSesion() {
    if (!supabaseConfigurado) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMensaje(`No se pudo cerrar la sesión: ${error.message}`);
    else navegarA('catalogo');
  }
  async function exportar() {
    const db = await abrirDB(); const respaldo = await exportarRespaldo(db); descargarRespaldoJSON(respaldo);
  }
  async function exportarXLSX() {
    setOcupadoExcel(true); setMensaje(null);
    try {
      const db = await abrirDB();
      const contenido = await exportarExcel(db);
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      enlace.download = `candelaria-intercambio-${new Date().toISOString().slice(0, 10)}.xlsx`;
      enlace.click(); URL.revokeObjectURL(enlace.href);
      setMensaje('Excel exportado con el catálogo vigente y los pedidos de consulta. No se modificó ningún dato.');
    } catch (error) { setMensaje(`No se pudo exportar Excel: ${error.message}`); }
    finally { setOcupadoExcel(false); }
  }
  async function aplicarExcel() {
    if (ocupadoExcel || !revision?.valida || revision.cambios.length === 0) return;
    if (!confirm(`Se crearán ${revision.resumen.nuevos} registros y se modificarán ${revision.resumen.modificados}. Cambian ${revision.cambiosPrecios.length} precios. Se descargará un respaldo JSON previo. Las fotos, los pedidos y los registros omitidos se conservarán. ¿Aplicar exclusivamente estos cambios?`)) return;
    setOcupadoExcel(true);
    try {
      const db = await abrirDB();
      const resultado = await aplicarRevisionExcel(db, revision, (previo) => descargarRespaldoJSON(previo, 'respaldo-candelaria-antes-de-excel'));
      invalidarCatalogo(); setRevision(null);
      setParametros(await obtenerParametrosVigentes(db)); await actualizarConteos();
      try {
        await sincronizarCatalogoPublico(db);
        setMensaje(`Importación terminada: ${resultado.nuevos} nuevos y ${resultado.modificados} modificados. Se descargó el respaldo previo y se actualizó el catálogo público.`);
      } catch (error) {
        setMensaje(`Los cambios se guardaron correctamente, pero falta sincronizar el catálogo público: ${error.message}. Se reintentará al iniciar sesión.`);
      }
    } catch (error) { setMensaje(`No se pudo aplicar Excel: ${error.message}`); }
    finally { setOcupadoExcel(false); }
  }
  async function revisarFotos() {
    try {
      const db = await abrirDB();
      const resultado = await revisarMigracionFotos(db);
      setRevisionFotos(resultado);
      setMensaje(resultado.fotosBase64 > 0 ? 'Revisión terminada. No se modificó ninguna foto.' : 'Todas las fotos del catálogo ya están guardadas como URL.');
    } catch (e) { setMensaje(`No se pudieron revisar las fotos: ${e.message}`); }
  }
  async function migrarFotos() {
    if (!revisionFotos?.fotosBase64 || migrandoFotos) return;
    if (!confirm(`Se migrarán ${revisionFotos.fotosBase64} fotos de ${revisionFotos.registrosPendientes} registros a Supabase Storage. Antes se descargará un respaldo JSON. ¿Continuar?`)) return;
    setMigrandoFotos(true); setProgresoFotos({ migrados: 0, total: revisionFotos.registrosPendientes, fotosMigradas: 0 });
    try {
      const db = await abrirDB();
      const previo = await exportarRespaldo(db);
      descargarRespaldoJSON(previo, 'respaldo-candelaria-antes-de-migrar-fotos');
      const resultado = await migrarFotosCatalogo(db, setProgresoFotos);
      invalidarCatalogo();
      await sincronizarCatalogoPublico(db);
      const revisionActualizada = await revisarMigracionFotos(db);
      setRevisionFotos(revisionActualizada);
      setMensaje(`Migración terminada: ${resultado.fotosMigradas} fotos de ${resultado.registrosMigrados} registros. Se descargó un respaldo previo.`);
    } catch (e) {
      setMensaje(`La migración se detuvo: ${e.message} Los registros ya migrados conservan sus URLs y se puede reanudar volviendo a revisar.`);
    } finally { setMigrandoFotos(false); }
  }
  async function importar(evento) {
    const entrada = evento.currentTarget; const archivo = entrada.files?.[0]; if (!archivo) return;
    try {
      const respaldo = validarRespaldo(JSON.parse(await archivo.text()));
      if (!confirm('Se validó el respaldo. Se descargará una copia de seguridad actual y luego se reemplazarán los datos. ¿Continuar?')) return;
      const db = await abrirDB();
      const previo = await exportarRespaldo(db);
      descargarRespaldoJSON(previo, 'respaldo-candelaria-antes-de-importar');
      await importarRespaldo(db, respaldo);
      invalidarCatalogo();
      await sincronizarCatalogoPublico(db);
      setMensaje('Respaldo importado correctamente. También se descargó una copia del estado anterior.');
    } catch (e) { setMensaje(`No se pudo importar: ${e.message}`); } finally { entrada.value = ''; }
  }
  function descargarCSV(nombre, filas) {
    const escapar = (valor) => `"${(typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor ?? '')).replaceAll('"', '""')}"`;
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
  async function importarCSV(evento, tipo) {
    const entrada = evento.currentTarget; const archivo = entrada.files?.[0]; if (!archivo) return;
    setOcupadoExcel(true); setRevision(null);
    try {
      const db = await abrirDB();
      const resultado = prepararRevisionCSV(await archivo.text(), tipo, await exportarRespaldo(db));
      setRevision({ ...resultado, archivo: archivo.name });
      setMensaje('CSV revisado. Todavía no se modificó ningún dato.');
    } catch (e) { setMensaje(`No se pudo revisar ${tipo}: ${e.message}`); } finally { entrada.value = ''; setOcupadoExcel(false); }
  }
  async function revisarExcel(evento) {
    const entrada = evento.currentTarget; const archivo = entrada.files?.[0]; if (!archivo) return;
    setOcupadoExcel(true); setRevision(null);
    try {
      setRevision(await revisarArchivoExcel(await abrirDB(), archivo));
      setMensaje('Planilla revisada. La aplicación todavía no modificó ningún dato.');
    } catch (e) { setMensaje(`No se pudo leer la planilla: ${e.message}`); } finally { entrada.value = ''; setOcupadoExcel(false); }
  }
  if (!parametros) return <p class="texto-cuerpo-s">Cargando ajustes…</p>;
  return <section class="ajustes-pantalla">
    <section class="ajustes-seccion"><h2 class="texto-seccion">Parámetros de cálculo</h2><div class="ajustes-campos">{CAMPOS.map(([id, etiqueta, paso]) => <label class="campo-entrada" key={id}><span>{etiqueta}</span><input type="number" step={paso} value={parametros[id]} onInput={(e) => setParametros({ ...parametros, [id]: Number(e.currentTarget.value) })} /></label>)}</div><p class="texto-cuerpo-s">Cambiar estos valores recalcula el catálogo, pero no modifica los pedidos ya tomados.</p><button type="button" class="boton-primario" onClick={guardarCambios}>Guardar parámetros</button></section>
    <section class="ajustes-seccion"><h2 class="texto-seccion">Mensajes</h2>{['confirmacion', 'pago', 'pago_anulado', 'recordatorio', 'entrega', 'entrega_corregida'].map((id) => <button type="button" class="fila-ajuste" key={id} onClick={() => navegarA(`plantilla/${id}`)}><span>{id.replaceAll('_', ' ').replace(/^./, (letra) => letra.toUpperCase())}</span><span>›</span></button>)}</section>
    {mensaje && <p class="aviso aviso--info">{mensaje}</p>}
    {revision && <RevisionExcel revision={revision} ocupado={ocupadoExcel} aplicar={aplicarExcel} cancelar={() => setRevision(null)} />}
    <section class="ajustes-seccion">
      <h2 class="texto-seccion">Datos</h2>
      {conteos && <div class="tarjeta"><h3 class="texto-seccion">Catálogo actual</h3><p class="texto-cuerpo-s">Insumos: {conteos.insumos} · Productos: {conteos.productos} · Combos: {conteos.combos}</p><button type="button" class="boton-secundario" onClick={() => actualizarConteos().catch((e) => setMensaje(`No se pudo consultar el catálogo: ${e.message}`))}>Actualizar conteos</button></div>}
      <button type="button" class="fila-ajuste" onClick={exportar}><span>Respaldo</span><span>Descargar JSON</span></button>
      <label class="fila-ajuste"><span>Importar respaldo JSON</span><input type="file" disabled={ocupadoExcel} accept="application/json,.json" onChange={importar} /></label>
      <button type="button" class="fila-ajuste" disabled={ocupadoExcel} onClick={exportarXLSX}><span>Exportar para Excel</span><span>{ocupadoExcel ? 'Procesando…' : 'XLSX'}</span></button>
      <label class="fila-ajuste"><span>Revisar e importar Excel (máx. 20 MB)</span><input type="file" disabled={ocupadoExcel} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" onChange={revisarExcel} /></label>
      <p class="texto-cuerpo-s">Exportá primero el catálogo vigente. Al importar se muestran los cambios antes de pedir confirmación; los pedidos y las fotos se conservan.</p>
      <button type="button" class="fila-ajuste" disabled={ocupadoExcel} onClick={exportarCSV}><span>Exportar CSV (compatibilidad)</span><span>CSV</span></button>
      <label class="fila-ajuste"><span>Revisar insumos CSV</span><input type="file" disabled={ocupadoExcel} accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'insumos')} /></label>
      <label class="fila-ajuste"><span>Revisar productos CSV</span><input type="file" disabled={ocupadoExcel} accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'productos')} /></label>
      <label class="fila-ajuste"><span>Revisar combos CSV</span><input type="file" disabled={ocupadoExcel} accept="text/csv,.csv" onChange={(e) => importarCSV(e, 'combos')} /></label>
      {supabaseConfigurado && <>
        <button type="button" class="fila-ajuste" disabled={migrandoFotos || ocupadoExcel} onClick={revisarFotos}><span>Fotos del catálogo</span><span>Revisar migración</span></button>
        {revisionFotos && <div class="tarjeta importacion-revision"><h3 class="texto-seccion">Estado de las fotos</h3><p class="texto-cuerpo-s">Fotos pendientes en Base64: {revisionFotos.fotosBase64} · Fotos con URL: {revisionFotos.fotosConUrl} · Productos o combos pendientes: {revisionFotos.registrosPendientes}</p>{progresoFotos && migrandoFotos && <p class="texto-cuerpo-s">Migrando registro {progresoFotos.migrados} de {progresoFotos.total} · {progresoFotos.fotosMigradas} fotos completadas</p>}{revisionFotos.fotosBase64 > 0 && <button type="button" class="boton-secundario" disabled={migrandoFotos || ocupadoExcel} onClick={migrarFotos}>{migrandoFotos ? 'Migrando fotos…' : 'Migrar fotos a Storage'}</button>}</div>}
        <button type="button" class="boton-secundario" onClick={cerrarSesion}>Cerrar sesión</button>
      </>}
    </section>
  </section>;
}
