import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLibroExcel, escribirExcel, leerExcelIntercambio } from './excelLibro.js';
import { prepararRevisionExcel } from './excelRevision.js';
import { aplicarRevisionExcel } from './excelRepo.js';
import { prepararRevisionCSV, parsearCSV } from './excelCSV.js';
import { firmaEstadoExcel } from './excelContrato.js';
import { abrirDB, guardar, aplicarCambiosExcelAtomicos } from './db.js';
import { exportarRespaldo } from './respaldo.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';

// Datos exclusivamente de prueba, en fake-indexeddb. No usan Supabase.
export function estadoPrueba() {
  const insumos = ['Cera alto pf', 'Cera bajo pf', 'Pabilo', 'Yeso', 'Esencia', 'Colorante', 'Aceite de coco'].map((nombre, i) => ({ id: `M${i + 1}`, codigo: `M${i + 1}`, nombre, categoria: 'MATERIAL', unidad: 'g', montoCompra: 20 + i, cantidadCompra: 1, activo: true }));
  const producto = { id: 'V1', codigo: 'V1', nombre: 'Vela prueba', categoria: 'VELA', ceraAltoPF: 82, ceraBajoPF: 0, pabilo: 0.5, yeso: 0, minutosManoObra: 45, recipienteCosto: 0, recipienteCantidad: 0, heredaCostoDe: null, extras: [{ insumoId: 'M3', cantidad: 2, observacion: 'conservar' }], fotos: ['https://example.invalid/vela.jpg'], activo: true };
  return { version: 1, insumos, productos: [producto, { ...producto, id: 'V2', codigo: 'V2', nombre: 'Otra prueba', heredaCostoDe: 'V1', extras: [], activo: false }], combos: [{ id: 'C1', nombre: 'Combo prueba', lineas: [{ tipo: 'PRODUCTO', refId: 'V1', cantidad: 2, observacion: 'conservar' }, { tipo: 'INSUMO', refId: 'M3', cantidad: 1 }], fotos: ['https://example.invalid/combo.jpg'], activo: true }], parametros: [{ ...PARAMETROS_INICIALES, id: 'actuales', datoFueraExcel: 'conservar' }], pedidos: [{ id: 'P1', numero: 1, fecha: '2026-09-15T12:00:00Z', clienteNombre: 'Cliente prueba', clienteTelefono: '', notaInterna: '', estadoEntrega: 'PENDIENTE', lineas: [{ tipo: 'PRODUCTO', refId: 'V1', nombreCongelado: 'Vela prueba', precioOriginal: 100, precioAplicado: 100, cantidad: 1 }], pagos: [{ id: 'pago1', monto: 50, medio: 'EFECTIVO', fecha: '2026-09-15T12:00:00Z', anulado: true }], historial: [{ tipo: 'MENSAJE', texto: 'Texto generado de prueba', fecha: '2026-09-15T12:00:00Z' }], total: 100, pagado: 0, saldo: 100 }] };
}
function libroPlano(estado) {
  return { hojas: crearLibroExcel(estado).worksheets.map((hoja) => ({ nombre: hoja.name, filas: Array.from({ length: hoja.rowCount }, (_, i) => hoja.getRow(i + 1).values.slice(1)) })) };
}
function cambiar(libro, hoja, titulo, valor, fila = 1) {
  const h = libro.hojas.find((item) => item.nombre === hoja);
  h.filas[fila][h.filas[0].indexOf(titulo)] = valor;
}
function revisarCambio(estado = estadoPrueba()) {
  const libro = libroPlano(estado); cambiar(libro, 'Insumos', 'Monto de compra ($)', 40);
  return prepararRevisionExcel(libro, estado);
}
async function basePrueba() {
  const db = await abrirDB();
  await new Promise((resolve, reject) => { const tx = db.transaction([...db.objectStoreNames], 'readwrite'); for (const clave of db.objectStoreNames) tx.objectStore(clave).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  const estado = estadoPrueba();
  for (const clave of ['insumos', 'productos', 'combos', 'parametros', 'pedidos']) for (const registro of estado[clave]) await guardar(db, clave, registro);
  return { db, estado: await exportarRespaldo(db) };
}

test('XLSX real: exportación y relectura sin cambios ni mutación del origen', async () => {
  const estado = estadoPrueba(); const antes = structuredClone(estado);
  const datos = await escribirExcel(estado);
  const revision = prepararRevisionExcel(await leerExcelIntercambio(new Blob([datos])), estado);
  assert.equal(revision.valida, true, JSON.stringify(revision.errores));
  assert.equal(revision.cambios.length, 0);
  assert.equal(revision.resumen.sinCambios, 11);
  assert.deepEqual(estado, antes);
  assert.deepEqual(revision.candidatos, estado);
});
test('11 hojas, números y fechas reales, id gris, calculados como valores, mensajes exportados', () => {
  const libro = crearLibroExcel(estadoPrueba());
  assert.equal(libro.worksheets.length, 11);
  assert.equal(typeof libro.getWorksheet('Insumos').getCell('F2').value, 'number');
  assert.equal(libro.getWorksheet('Insumos').getCell('A2').fill.fgColor.tint, 0.9);
  assert.ok(libro.getWorksheet('Pedidos').getCell('C2').value instanceof Date);
  assert.equal(libro.getWorksheet('PedidosHistorial').getCell('F2').value, 'Texto generado de prueba');
  libro.eachSheet((hoja) => hoja.eachRow((fila) => fila.eachCell((celda) => assert.equal(celda.value?.formula, undefined))));
});
test('Parámetros vacíos: defaults exportados no disparan una siembra', () => {
  const estado = estadoPrueba(); estado.parametros = [];
  const revision = prepararRevisionExcel(libroPlano(estado), estado);
  assert.equal(revision.valida, true); assert.equal(revision.cambios.length, 0);
});
test('La precisión de 15 cifras de Excel no corrige valores actuales', () => {
  const estado = estadoPrueba(); estado.insumos[0].montoCompra = 124.19999999999999; estado.productos[0].minutosManoObra = 62.999999999999986;
  const libro = libroPlano(estado); cambiar(libro, 'Insumos', 'Monto de compra ($)', 124.2); cambiar(libro, 'Productos', 'Mano de obra (min)', 63);
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, true); assert.equal(revision.cambios.length, 0);
  assert.equal(revision.candidatos.insumos[0].montoCompra, estado.insumos[0].montoCompra);
  assert.equal(revision.candidatos.productos[0].minutosManoObra, estado.productos[0].minutosManoObra);
});
test('Cambio de insumo muestra diferencias e impacto sin tocar fotos, pedidos ni recetas', () => {
  const estado = estadoPrueba(); const antes = structuredClone(estado); const revision = revisarCambio(estado);
  assert.equal(revision.valida, true, JSON.stringify(revision.errores));
  assert.equal(revision.resumen.modificados, 1);
  assert.equal(revision.cambios[0].diferencias[0].antes, 20);
  assert.equal(revision.cambios[0].diferencias[0].despues, 40);
  assert.deepEqual(revision.cambiosPrecios.map((c) => c.id), ['V1', 'C1']);
  assert.ok(revision.mayorVariacion.variacion > 0);
  assert.deepEqual(revision.candidatos.productos, estado.productos);
  assert.deepEqual(revision.candidatos.pedidos, estado.pedidos); assert.deepEqual(estado, antes);
});
test('Columnas calculadas y hojas de pedidos modificadas se ignoran', () => {
  const estado = estadoPrueba(); const libro = libroPlano(estado);
  cambiar(libro, 'Insumos', 'Costo unitario [calculado]', { formula: '1/0', result: 0 });
  libro.hojas.find((h) => h.nombre === 'Pedidos').filas[1][0] = 'inventado';
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, true); assert.equal(revision.cambios.length, 0); assert.deepEqual(revision.candidatos.pedidos, estado.pedidos);
});
test('Planilla parcial conserva todos los registros omitidos y hojas de recetas ausentes', () => {
  const estado = estadoPrueba(); const libro = libroPlano(estado);
  libro.hojas = libro.hojas.filter((h) => ['Instrucciones', 'Productos'].includes(h.nombre));
  libro.hojas.find((h) => h.nombre === 'Productos').filas.pop();
  cambiar(libro, 'Productos', 'Nombre', 'Nombre nuevo');
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, true); assert.equal(revision.cambios.length, 1);
  assert.deepEqual(revision.candidatos.productos[0].extras, estado.productos[0].extras);
  assert.deepEqual(revision.candidatos.productos[1], estado.productos[1]);
  assert.deepEqual(revision.candidatos.insumos, estado.insumos); assert.ok(revision.omitidos > 0);
});
test('Quitar un extra figura explícitamente en la revisión, no se aplica al preparar', () => {
  const estado = estadoPrueba(); const libro = libroPlano(estado);
  libro.hojas.find((h) => h.nombre === 'ProductosExtras').filas.splice(1);
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, true); assert.equal(revision.cambios[0].diferencias[0].campo, 'Insumos adicionales');
  assert.equal(estado.productos[0].extras.length, 1); assert.equal(revision.candidatos.productos[0].extras.length, 0);
});
test('Altas con id vacío resuelven referencias a nuevas entidades del mismo archivo', () => {
  const estado = estadoPrueba(); const libro = libroPlano(estado);
  const ins = libro.hojas.find((h) => h.nombre === 'Insumos'); ins.filas.push([...ins.filas[1]]);
  cambiar(libro, 'Insumos', 'id', '', 8); cambiar(libro, 'Insumos', 'Código', 'M8', 8);
  const prod = libro.hojas.find((h) => h.nombre === 'Productos'); prod.filas.push([...prod.filas[1]]);
  cambiar(libro, 'Productos', 'id', '', 3); cambiar(libro, 'Productos', 'Código', 'V3', 3);
  const extras = libro.hojas.find((h) => h.nombre === 'ProductosExtras'); extras.filas.push(['', 'V3', 'M8', 3]);
  const combos = libro.hojas.find((h) => h.nombre === 'Combos'); combos.filas.push([...combos.filas[1]]);
  cambiar(libro, 'Combos', 'id', '', 2); cambiar(libro, 'Combos', 'Código', 'C2', 2);
  libro.hojas.find((h) => h.nombre === 'CombosLineas').filas.push(['', 'C2', 'PRODUCTO', 'V3', 2]);
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, true, JSON.stringify(revision.errores)); assert.equal(revision.resumen.nuevos, 3);
  assert.deepEqual(revision.candidatos.productos.at(-1).extras, [{ insumoId: 'M8', cantidad: 3 }]);
});
for (const [descripcion, hoja, titulo, valor, esperado] of [
  ['id desconocido', 'Insumos', 'id', 'INEXISTENTE', /id inexistente/],
  ['costo negativo', 'Insumos', 'Monto de compra ($)', -1, /no negativo/],
  ['costo no finito', 'Insumos', 'Monto de compra ($)', Infinity, /no negativo/],
  ['costo cero nuevo', 'Insumos', 'Monto de compra ($)', 0, /requiere consulta/],
  ['cantidad compra cero', 'Insumos', 'Cantidad de compra', 0, /mayor a cero/],
  ['unidad desconocida', 'Insumos', 'Unidad', 'litros raros', /unidad desconocida/],
  ['fórmula editable', 'Insumos', 'Monto de compra ($)', { formula: '1+1', result: 2 }, /fórmula/],
  ['herencia desconocida', 'Productos', 'Hereda costo de (código)', 'OTRO', /producto inexistente/],
  ['ciclo', 'Productos', 'Hereda costo de (código)', 'V2', /ciclo de herencia/],
  ['extra inexistente', 'ProductosExtras', 'Código insumo', 'OTRO', /insumo inexistente/],
  ['componente inexistente', 'CombosLineas', 'Código componente', 'OTRO', /componente inexistente/],
  ['cantidad componente cero', 'CombosLineas', 'Cantidad', 0, /mayor a cero/],
]) test(`Bloquea ${descripcion} sin mutar datos`, () => {
  const estado = estadoPrueba(); const antes = structuredClone(estado); const libro = libroPlano(estado);
  cambiar(libro, hoja, titulo, valor);
  const revision = prepararRevisionExcel(libro, estado);
  assert.equal(revision.valida, false); assert.match(revision.errores.map((e) => e.mensaje).join(' '), esperado); assert.deepEqual(estado, antes);
});
test('Rechaza duplicados, columnas ausentes y Excel histórico', () => {
  const estado = estadoPrueba(); const libro = libroPlano(estado);
  libro.hojas.find((h) => h.nombre === 'Insumos').filas.push([...libro.hojas[0].filas[1]]);
  assert.match(prepararRevisionExcel(libro, estado).errores.map((e) => e.mensaje).join(' '), /duplicado/);
  libro.hojas[0].filas[0][0] = 'otro';
  assert.match(prepararRevisionExcel(libro, estado).errores.map((e) => e.mensaje).join(' '), /falta esta columna/);
  assert.equal(prepararRevisionExcel({ hojas: [] }, estado).valida, false);
});
test('CSV seguro conserva fotos y recetas; acepta coma y punto decimal del legado', () => {
  const estado = estadoPrueba();
  for (const valor of ['40,5', '40.5']) {
    const revision = prepararRevisionCSV(`id;codigo;nombre;montoCompra\nM1;M1;Cera alto pf;${valor}`, 'insumos', estado);
    assert.equal(revision.valida, true, JSON.stringify(revision.errores)); assert.equal(revision.cambios.length, 1);
  }
  const revision = prepararRevisionCSV('id;codigo;nombre\nV1;V1;"Nombre; con separador"', 'productos', estado);
  assert.equal(revision.valida, true); assert.deepEqual(revision.candidatos.productos[0].fotos, estado.productos[0].fotos);
  assert.deepEqual(revision.candidatos.productos[0].extras, estado.productos[0].extras);
  assert.throws(() => prepararRevisionCSV('id;codigo;nombre;heredaCostoDe\nV1;V1;Vela;inexistente', 'productos', estado), /inexistente/);
  assert.throws(() => parsearCSV('id;id\n1;1'), /duplicadas/);
  assert.throws(() => parsearCSV('id;nombre\n1;"texto'), /sin cerrar/);
});
test('No-op no descarga respaldo ni abre ninguna transacción', async () => {
  const resultado = await aplicarRevisionExcel({}, { valida: true, errores: [], cambios: [] }, () => { throw new Error('No debe ejecutarse'); });
  assert.deepEqual(resultado, { nuevos: 0, modificados: 0 });
});
test('Aplicación local cambia solo lo revisado y descarga respaldo previo', async () => {
  const { db, estado } = await basePrueba(); let respaldo;
  const resultado = await aplicarRevisionExcel(db, revisarCambio(estado), (valor) => { respaldo = valor; });
  assert.equal(resultado.modificados, 1); assert.equal(respaldo.insumos[0].montoCompra, 20);
  const actual = await exportarRespaldo(db); assert.equal(actual.insumos[0].montoCompra, 40);
  assert.deepEqual(actual.productos, estado.productos); assert.deepEqual(actual.pedidos, estado.pedidos);
});
test('Revisión vencida y error al descargar respaldo no aplican ningún cambio', async () => {
  const { db, estado } = await basePrueba(); const revision = revisarCambio(estado);
  await assert.rejects(aplicarRevisionExcel(db, revision, () => { throw new Error('descarga fallida'); }), /descarga fallida/);
  assert.equal(firmaEstadoExcel(await exportarRespaldo(db)), firmaEstadoExcel(estado));
  await guardar(db, 'insumos', { ...estado.insumos[1], nombre: 'Cambio concurrente' });
  await assert.rejects(aplicarRevisionExcel(db, revision, () => { throw new Error('No debe descargar'); }), /cambiaron desde/);
  assert.equal((await exportarRespaldo(db)).insumos[0].montoCompra, 20);
});
test('Cambio concurrente durante descarga se detecta dentro de la transacción', async () => {
  const { db, estado } = await basePrueba();
  await assert.rejects(aplicarRevisionExcel(db, revisarCambio(estado), () => guardar(db, 'insumos', { ...estado.insumos[1], nombre: 'Concurrente' })), /cambiaron desde/);
  assert.equal((await exportarRespaldo(db)).insumos[0].montoCompra, 20);
});
test('Falla de unicidad en segunda escritura revierte la primera', async () => {
  const { db, estado } = await basePrueba();
  const cambios = [{ clave: 'insumos', nuevo: false, registro: { ...estado.insumos[0], montoCompra: 40 } }, { clave: 'insumos', nuevo: true, registro: { ...estado.insumos[1], id: 'NUEVO', codigo: estado.insumos[1].codigo } }];
  await assert.rejects(aplicarCambiosExcelAtomicos(db, cambios, estado));
  assert.equal(firmaEstadoExcel(await exportarRespaldo(db)), firmaEstadoExcel(estado));
});
test('Supabase usa una sola RPC y excluye pedidos; falta de función bloquea escritura', async () => {
  const estado = estadoPrueba(); const revision = revisarCambio(estado); let llamadas = 0;
  const cliente = { rpc: async (nombre, args) => { llamadas++; assert.equal(nombre, 'aplicar_intercambio_excel'); assert.equal(args.p_estado.pedidos, undefined); assert.deepEqual(args.p_estado.productos.V1.fotos, estado.productos[0].fotos); assert.equal(args.p_cambios.insumos.length, 1); return { error: null }; } };
  await aplicarCambiosExcelAtomicos({ tipo: 'supabase' }, revision.cambios, estado, cliente); assert.equal(llamadas, 1);
  await assert.rejects(aplicarCambiosExcelAtomicos({ tipo: 'supabase' }, revision.cambios, estado, { rpc: async () => ({ error: { code: 'PGRST202' } }) }), /No se modificó ningún dato/);
  await assert.rejects(aplicarCambiosExcelAtomicos({}, [{ clave: 'pedidos', registro: { id: 'P1' } }], estado), /no admitido/);
});
