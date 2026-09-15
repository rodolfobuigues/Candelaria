/** @jsx h */
import { h, Fragment } from 'preact';
import { formatearImporte } from '../../config/formato.js';

function mostrar(valor) {
  if (Array.isArray(valor)) return valor.length ? valor.map((item) => `${item.insumoId ?? item.refId} × ${item.cantidad}`).join(' · ') : 'Sin componentes';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (valor === null || valor === undefined || valor === '') return 'Vacío';
  return String(valor);
}

export function RevisionExcel({ revision, ocupado, aplicar, cancelar }) {
  return <section class="tarjeta importacion-revision" aria-label="Revisar importación Excel">
    <h2 class="texto-seccion">Revisar importación</h2>
    <p class="texto-cuerpo-s">{revision.archivo}</p>
    {!revision.valida ? <>
      <p class="aviso">La planilla contiene errores. No se puede aplicar y no se modificó ningún dato.</p>
      <ul class="importacion-pendientes">{revision.errores.map((error, indice) => <li key={indice}>{error.hoja} · fila {error.fila}{error.campo ? ` · ${error.campo}` : ''}: {error.mensaje}</li>)}</ul>
    </> : <>
      <div class="importacion-contadores">{[['nuevos', 'Nuevos'], ['modificados', 'Modificados'], ['sinCambios', 'Sin cambios']].map(([clave, etiqueta]) => <div key={clave}><strong>{revision.resumen[clave]}</strong><span>{etiqueta}</span></div>)}</div>
      <p class="aviso aviso--info">Cambian {revision.cambiosPrecios.length} precios de venta.{revision.mayorVariacion && ` Mayor variación: ${revision.mayorVariacion.codigo}, ${formatearImporte(Math.abs(revision.mayorVariacion.variacion))}${revision.mayorVariacion.porcentaje === null ? '' : ` (${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(revision.mayorVariacion.porcentaje)} %)`}.`}</p>
      <p class="texto-cuerpo-s">{revision.omitidos} registros omitidos se conservarán. Las fotos y los pedidos actuales no se reemplazan.</p>
      {revision.advertencias.map((aviso, indice) => <p class="texto-cuerpo-s" key={indice}>{aviso}</p>)}
      {revision.cambios.length === 0 ? <p class="texto-cuerpo-s">La planilla no contiene cambios. No se escribirá ningún registro.</p> : <ul class="importacion-cambios">{revision.cambios.map((cambio) => <li key={`${cambio.clave}:${cambio.id}`}>
        <strong>{cambio.codigo} · {cambio.nombre}</strong><span class="texto-cuerpo-s">{cambio.hoja} · fila {cambio.fila}{cambio.nuevo ? ' · Nuevo' : ''}</span>
        <dl>{cambio.diferencias.map((diferencia) => <div key={diferencia.campo}><dt>{diferencia.campo}</dt><dd><del>{mostrar(diferencia.antes)}</del><span aria-hidden="true"> → </span><strong>{mostrar(diferencia.despues)}</strong></dd></div>)}</dl>
      </li>)}</ul>}
      {revision.cambiosPrecios.length > 0 && <details><summary>Ver precios afectados ({revision.cambiosPrecios.length})</summary><ul class="importacion-pendientes">{revision.cambiosPrecios.map((cambio) => <li key={`${cambio.clave}:${cambio.id}`}>{cambio.codigo} · {cambio.nombre}: <del>{formatearImporte(cambio.antes)}</del> → <strong>{formatearImporte(cambio.despues)}</strong></li>)}</ul></details>}
      <p class="texto-cuerpo-s">Antes de aplicar se descargará automáticamente un respaldo JSON del estado vigente. Guardalo: es la copia de seguridad completa.</p>
    </>}
    <div class="fila-botones"><button type="button" class="boton-secundario" disabled={ocupado} onClick={cancelar}>Cancelar</button><button type="button" class="boton-primario" disabled={ocupado || !revision.valida || revision.cambios.length === 0} onClick={aplicar}>{ocupado ? 'Procesando…' : 'Aplicar cambios'}</button></div>
  </section>;
}
