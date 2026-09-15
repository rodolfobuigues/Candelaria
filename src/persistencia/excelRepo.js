import { exportarRespaldo } from './respaldo.js';
import { prepararRevisionExcel } from './excelRevision.js';
import { firmaEstadoExcel } from './excelContrato.js';
import { aplicarCambiosExcelAtomicos } from './db.js';

export async function exportarExcel(db) {
  const estado = await exportarRespaldo(db);
  const { escribirExcel } = await import('./excelLibro.js');
  return escribirExcel(estado, { fuente: db?.tipo === 'supabase' ? 'Supabase' : 'Base local' });
}

export async function revisarExcel(db, archivo) {
  const { leerExcelIntercambio } = await import('./excelLibro.js');
  const libro = await leerExcelIntercambio(archivo);
  const estado = await exportarRespaldo(db);
  return { ...prepararRevisionExcel(libro, estado), archivo: archivo.name };
}

export async function aplicarRevisionExcel(db, revision, descargarRespaldo) {
  if (!revision?.valida || revision.errores?.length) throw new Error('La revisión contiene errores; no se aplicó ningún cambio.');
  if (revision.cambios.length === 0) return { nuevos: 0, modificados: 0 };
  if (typeof descargarRespaldo !== 'function') throw new Error('Es obligatorio descargar el respaldo previo antes de aplicar.');
  const previo = await exportarRespaldo(db);
  if (firmaEstadoExcel(previo) !== revision.firmaBase) throw new Error('Los datos cambiaron desde la revisión. Volvé a revisar el archivo; no se aplicó ningún cambio.');
  await descargarRespaldo(previo);
  // El adaptador vuelve a comparar y escribe todo en una sola transacción.
  return aplicarCambiosExcelAtomicos(db, revision.cambios, previo);
}
