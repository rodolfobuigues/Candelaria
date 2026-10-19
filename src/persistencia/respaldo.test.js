import 'fake-indexeddb/auto';
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB, obtenerTodos, obtenerPorId, guardar, eliminarTodo } from './db.js';
import { exportarRespaldo, importarRespaldo, validarRespaldo, crearCopiaPreviaRestauracion } from './respaldo.js';
import { listarPedidos, obtenerPedido, guardarPedido } from './pedidosRepo.js';
import { TIENDAS } from './esquema.js';

// Una sola conexión compartida: indexedDB.deleteDatabase() se queda colgado
// ("blocked") si queda alguna conexión abierta, así que entre tests vaciamos
// las tiendas en vez de borrar la base entera.
let db;

before(async () => {
  db = await abrirDB();
});

beforeEach(async () => {
  await Promise.all(Object.values(TIENDAS).map((tienda) => eliminarTodo(db, tienda)));
});

// Criterio 5 — ESPECIFICACION.md § 8: "Exportar e importar el respaldo
// devuelve una base idéntica."
describe('respaldo.js — exportación e importación', () => {
  test('exportar e importar devuelve una base idéntica', async () => {
    await guardar(db, TIENDAS.INSUMOS, { id: 'i1', codigo: 'M1', nombre: 'Cera alto PF', unidad: 'g', montoCompra: 1000, cantidadCompra: 100, activo: true });
    await guardar(db, TIENDAS.PRODUCTOS, { id: 'p1', codigo: 'V1', nombre: 'Pino chico', activo: true });
    await guardar(db, TIENDAS.COMBOS, { id: 'c1', nombre: 'Combo A', activo: true });
    await guardar(db, TIENDAS.PARAMETROS, { id: 'global', beneficio: 0.35 });
    await guardar(db, TIENDAS.PEDIDOS, {
      id: 'ped1',
      numero: 1,
      fecha: '2026-07-20T10:00:00.000Z',
      estadoEntrega: 'PENDIENTE',
      clienteNombre: 'Mara',
      lineas: [{ tipo: 'PRODUCTO', refId: 'V1', nombreCongelado: 'Pino chico', precioOriginal: 10400, precioAplicado: 10400, cantidad: 1 }],
      pagos: [{ id: 'pago-1', fecha: '2026-07-20T10:00:00.000Z', monto: 5000, medio: 'EFECTIVO', nota: '', anulado: false, fechaAnulacion: null }],
      historial: [],
    });

    const respaldo = await exportarRespaldo(db);
    // listarPedidos() derivó total/pagado/saldo/estadoCobro al exportar:
    // el respaldo los trae, aunque IndexedDB nunca los tuvo guardados.
    assert.equal(respaldo.pedidos[0].total, 10400);
    assert.equal(respaldo.pedidos[0].pagado, 5000);
    assert.equal(respaldo.pedidos[0].saldo, 5400);
    assert.equal(respaldo.pedidos[0].estadoCobro, 'SEÑADO');

    // El registro guardado en IndexedDB, en cambio, nunca tuvo esos campos.
    const pedidoCrudo = await obtenerPorId(db, TIENDAS.PEDIDOS, 'ped1');
    assert.equal('total' in pedidoCrudo, false);
    assert.equal('estadoCobro' in pedidoCrudo, false);

    // Agregamos registros ajenos para probar que la importación los quita solo
    // después de guardar el respaldo completo. El pedido debe ser válido porque
    // la restauración segura respalda el estado actual antes de modificarlo.
    await guardar(db, TIENDAS.INSUMOS, { id: '__marcador__', codigo: 'MX', nombre: 'Marcador' });
    await guardar(db, TIENDAS.PRODUCTOS, { id: '__marcador__', codigo: 'VX', nombre: 'Marcador' });
    await guardar(db, TIENDAS.COMBOS, { id: '__marcador__', nombre: 'Marcador' });
    await guardar(db, TIENDAS.PARAMETROS, { id: '__marcador__' });
    await guardar(db, TIENDAS.PEDIDOS, { id: '__marcador__', numero: 999, fecha: '2026-07-20T10:00:00.000Z', clienteNombre: 'Marcador', lineas: [], pagos: [], historial: [] });
    await importarRespaldo(db, respaldo);

    const [insumos, productos, combos, parametros, pedidos] = await Promise.all([
      obtenerTodos(db, TIENDAS.INSUMOS),
      obtenerTodos(db, TIENDAS.PRODUCTOS),
      obtenerTodos(db, TIENDAS.COMBOS),
      obtenerTodos(db, TIENDAS.PARAMETROS),
      listarPedidos(db),
    ]);

    assert.deepEqual(insumos, respaldo.insumos);
    assert.deepEqual(productos, respaldo.productos);
    assert.deepEqual(combos, respaldo.combos);
    assert.deepEqual(parametros, respaldo.parametros);
    // pedidos también se compara vía listarPedidos: ambos lados derivan.
    assert.deepEqual(pedidos, respaldo.pedidos.map((pedido) => ({ ...pedido, revision: (pedido.revision ?? 0) + 1 })));

    // Y confirmamos que la reimportación tampoco dejó los derivados en
    // IndexedDB: guardarPedido() los despoja siempre.
    const pedidoReimportado = await obtenerPorId(db, TIENDAS.PEDIDOS, 'ped1');
    assert.equal('total' in pedidoReimportado, false);
    assert.equal('saldo' in pedidoReimportado, false);
  });

  test('el respaldo incluye version y fecha de exportación', async () => {
    const respaldo = await exportarRespaldo(db);
    assert.equal(respaldo.version, 1);
    assert.ok(respaldo.exportadoEn);
  });

  test('rechaza un respaldo incompleto antes de modificar la base', async () => {
    await guardar(db, TIENDAS.INSUMOS, { id: 'i1', codigo: 'M1', nombre: 'Original' });

    assert.throws(
      () => validarRespaldo({ version: 1, insumos: [] }),
      /no contiene la colección productos/
    );
    await assert.rejects(() => importarRespaldo(db, { version: 1, insumos: [] }), /no contiene la colección productos/);
    assert.equal((await obtenerPorId(db, TIENDAS.INSUMOS, 'i1')).nombre, 'Original');
  });

  test('el respaldo con códigos repetidos se rechaza antes de cualquier escritura', async () => {
    await guardar(db, TIENDAS.PRODUCTOS, { id: 'original', codigo: 'V1', nombre: 'Original' });
    const respaldo = await exportarRespaldo(db);
    respaldo.productos = [
      { id: 'nuevo', codigo: 'V1', nombre: 'Nuevo' },
      { id: 'conflicto', codigo: 'V1', nombre: 'Código repetido' },
    ];

    await assert.rejects(() => importarRespaldo(db, respaldo), /código V1 está duplicado/);

    const productos = await obtenerTodos(db, TIENDAS.PRODUCTOS);
    assert.deepEqual(productos, [{ id: 'original', codigo: 'V1', nombre: 'Original' }]);
  });

  test('cantidad de compra cero se rechaza sin cambiar el registro previo', async () => {
    const original = { id: 'i1', codigo: 'M1', nombre: 'Cera', unidad: 'g', montoCompra: 1000, cantidadCompra: 100 };
    await guardar(db, 'insumos', original);
    const respaldo = await exportarRespaldo(db);
    respaldo.insumos[0].cantidadCompra = 0;
    await assert.rejects(() => importarRespaldo(db, respaldo), /Cantidad de compra/);
    assert.deepEqual(await obtenerPorId(db, 'insumos', 'i1'), original);
  });

  test('las fotos exportadas se restauran aun cuando la URL original desaparece', async () => {
    await guardar(db, 'productos', { id: 'V1', codigo: 'V1', nombre: 'Pino', fotos: ['https://imagenes.invalid/foto.png'] });
    const respaldo = await exportarRespaldo(db, { descargar: async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }) });
    assert.equal(respaldo.medios.length, 1);
    assert.match(respaldo.medios[0].datos, /^data:image\/png;base64,/);
    await importarRespaldo(db, respaldo);
    assert.equal((await obtenerPorId(db, 'productos', 'V1')).fotos[0], respaldo.medios[0].datos);
  });

  test('una foto que no pudo descargarse impide generar una copia incompleta', async () => {
    await guardar(db, 'combos', { id: 'C1', nombre: 'Combo', fotos: ['https://imagenes.invalid/ausente.png'] });
    await assert.rejects(() => exportarRespaldo(db, { descargar: async () => new Response('', { status: 404 }) }), /no se generó completo/);
  });

  test('la recuperación admite una copia previa declarada de emergencia si falta una foto actual', async () => {
    const registro = { id: 'V1', codigo: 'V1', nombre: 'Foto perdida', fotos: ['https://imagenes.invalid/ausente.png'] };
    await guardar(db, 'productos', registro);
    const copia = await crearCopiaPreviaRestauracion(db, { descargar: async () => new Response('', { status: 404 }) });
    assert.equal(copia.completo, false);
    assert.match(copia.respaldo.advertenciaMedios, /sin copia/);
    assert.equal(copia.respaldo.medios, undefined);
    assert.deepEqual(copia.respaldo.productos, [registro]);
    assert.deepEqual(await obtenerPorId(db, 'productos', 'V1'), registro);
  });

  test('un respaldo cuya receta requiere un insumo ausente falla antes de escribir', async () => {
    const respaldo = await exportarRespaldo(db);
    respaldo.productos = [{ id: 'V1', codigo: 'V1', nombre: 'Vela', ceraAltoPF: 100 }];
    await assert.rejects(() => importarRespaldo(db, respaldo), /insumo fijo/);
    assert.equal((await obtenerTodos(db, 'productos')).length, 0);
  });

  test('un formulario abierto antes de restaurar no puede pisar el pedido restaurado', async () => {
    await guardar(db, 'pedidos', { id: 'P1', numero: 1, fecha: '2026-10-19T15:00:00Z', estadoEntrega: 'PENDIENTE', clienteNombre: 'Pedido de prueba', lineas: [], pagos: [], historial: [] });
    const obsoleto = await obtenerPedido(db, 'P1');
    const respaldo = await exportarRespaldo(db);
    await importarRespaldo(db, respaldo);
    await assert.rejects(() => guardarPedido(db, { ...obsoleto, notaInterna: 'Cambio de pantalla vieja' }), /otra sesión/);
    assert.equal((await obtenerPedido(db, 'P1')).notaInterna, undefined);
  });
});
