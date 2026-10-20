// PostgreSQL aislado en memoria. No usa URL, credenciales ni datos de Supabase.
// Uso: node supabase/verificar_seguridad.mjs [URL del módulo PGlite]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
const CREADOR = '00000000-0000-4000-8000-000000000001';
const OTRO = '00000000-0000-4000-8000-000000000002';
let comprobaciones = 0;
const comprobar = (valor, mensaje) => { assert.ok(valor, mensaje); comprobaciones += 1; };
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id text primary key,bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    -- Soporte de Storage administrado por Supabase, no tablas de la app.
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  await db.exec(`insert into auth.users values ('${CREADOR}'),('${OTRO}'); set candelaria.creador_id='${CREADOR}';`);
  for (const archivo of ['schema.sql', 'seguridad_datos.sql', 'intercambio_excel.sql']) await db.exec(await readFile(new URL(archivo, import.meta.url), 'utf8'));
  // Sin grants automáticos ni reparaciones de public desde el harness:
  // los archivos de instalación deben entregar la matriz completa por sí solos.
  const privadas = ['insumos', 'productos', 'combos', 'parametros', 'pedidos'];
  for (const tabla of [...privadas, 'catalogo_publico_combos', 'creadores_autorizados']) {
    comprobar((await db.query('select relrowsecurity from pg_class where oid=$1::regclass', [`public.${tabla}`])).rows[0].relrowsecurity,
      `RLS debe estar habilitado en ${tabla}`);
    for (const rol of ['anon', 'authenticated']) {
      for (const permiso of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const esperado = tabla === 'catalogo_publico_combos'
          ? rol === 'authenticated' || permiso === 'SELECT'
          : tabla !== 'creadores_autorizados' && rol === 'authenticated';
        const real = (await db.query('select has_table_privilege($1,$2,$3) permitido', [rol, `public.${tabla}`, permiso])).rows[0].permitido;
        comprobar(real === esperado, `${rol} ${permiso} en ${tabla}: esperado ${esperado}, recibido ${real}`);
      }
    }
  }
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${CREADOR}';
    insert into public.insumos(id,codigo,nombre,unidad,monto_compra,cantidad_compra) values ('M1','M1','Cera de prueba','g',100,1);`);
  for (const tabla of privadas) await db.query(`select * from public.${tabla}`);
  comprobar((await db.query('select * from public.insumos')).rows.length === 1);
  await db.exec(`set request.jwt.claim.sub='${OTRO}'`);
  for (const tabla of privadas) comprobar((await db.query(`select * from public.${tabla}`)).rows.length === 0,
    `Otro autenticado no debe leer ${tabla}`);
  await assert.rejects(() => db.exec("insert into public.insumos(id,codigo,nombre,unidad) values ('M2','M2','Intruso','g')"), /row-level security/); comprobaciones += 1;
  await assert.rejects(() => db.query('select public.guardar_pedido_seguro($1::jsonb,0,true)', [{}]), /creador autorizado/); comprobaciones += 1;
  await db.exec(`set request.jwt.claim.sub='${CREADOR}'`);
  const pedido = { id: 'P1', numero: 999, fecha: '2026-10-19T15:00:00Z', cliente_nombre: 'Prueba aislada', cliente_telefono: '', nota_interna: '', estado_entrega: 'PENDIENTE', lineas: [{ tipo: 'PRODUCTO', refId: 'V1', cantidad: 1, precioOriginal: 10000, precioAplicado: 10000 }], pagos: [], historial: [{ tipo: 'CREADO', descripcion: 'Pendiente' }], revision: 0 };
  const guardar = async (p, revision, nuevo) => (await db.query('select public.guardar_pedido_seguro($1::jsonb,$2,$3) resultado', [JSON.stringify(p), revision, nuevo])).rows[0].resultado;
  const primero = await guardar(pedido, 0, true);
  comprobar(primero.numero === 1 && primero.revision === 0);
  const segundo = await guardar({ ...pedido, id: 'P2' }, 0, true);
  comprobar(segundo.numero === 2);
  const pago = { id: 'pago-1', fecha: '2026-10-19T16:00:00Z', monto: 1000, medio: 'EFECTIVO', anulado: false };
  const actualizado = await guardar({ ...primero, pagos: [pago] }, 0, false);
  comprobar(actualizado.revision === 1 && actualizado.pagos.length === 1);
  await assert.rejects(() => guardar({ ...primero, pagos: [{ ...pago, id: 'pago-2' }] }, 0, false), /otra sesión/); comprobaciones += 1;
  comprobar((await db.query("select pagos from public.pedidos where id='P1'")).rows[0].pagos[0].id === 'pago-1');
  await assert.rejects(() => guardar({ ...actualizado, pagos: [pago, pago] }, 1, false), /duplicado/); comprobaciones += 1;
  await assert.rejects(() => db.exec("insert into public.parametros(id,datos) values ('actuales','{\"redondeo\":0}')"), /Parámetro inválido/); comprobaciones += 1;

  const snapshot = async () => {
    const estado = {};
    for (const tabla of ['insumos','productos','combos','parametros','pedidos']) estado[tabla] = (await db.query(`select coalesce(jsonb_object_agg(id,to_jsonb(t)-'updated_at'),'{}'::jsonb) valor from public.${tabla} t`)).rows[0].valor;
    return estado;
  };
  const previo = await snapshot();
  const destino = Object.fromEntries(Object.entries(previo).map(([clave, registros]) => [clave, Object.values(registros)]));
  const restaurar = async (estado, filas) => db.query('select public.restaurar_respaldo_seguro($1::jsonb,$2::jsonb)', [JSON.stringify(estado), JSON.stringify(filas)]);
  await restaurar(previo, destino);
  comprobar(JSON.stringify(await snapshot()) === JSON.stringify(previo));
  const fallo = structuredClone(destino); fallo.insumos.push({ ...fallo.insumos[0], id: 'M2' });
  await assert.rejects(() => restaurar(previo, fallo), /unique constraint/); comprobaciones += 1;
  comprobar(JSON.stringify(await snapshot()) === JSON.stringify(previo));
  await db.exec("update public.insumos set nombre='Nuevo nombre' where id='M1'");
  await assert.rejects(() => restaurar(previo, destino), /datos cambiaron/); comprobaciones += 1;
  comprobar((await db.query("select nombre from public.insumos where id='M1'")).rows[0].nombre === 'Nuevo nombre');
  const estadoExcel = await snapshot();
  delete estadoExcel.pedidos;
  const cambiosExcel = { insumos: [{ ...Object.values(estadoExcel.insumos)[0], nombre: 'Actualizado desde Excel' }], productos: [], combos: [], parametros: [] };
  const resultadoExcel = (await db.query('select public.aplicar_intercambio_excel($1::jsonb,$2::jsonb) resultado', [JSON.stringify(estadoExcel), JSON.stringify(cambiosExcel)])).rows[0].resultado;
  comprobar(resultadoExcel.nuevos === 0 && resultadoExcel.modificados === 1);
  comprobar((await db.query("select nombre from public.insumos where id='M1'")).rows[0].nombre === 'Actualizado desde Excel');
  await db.exec("reset role; insert into public.catalogo_publico_combos(id,nombre,precio) values ('C1','Comercial',100); set role anon; set request.jwt.claim.sub=''");
  comprobar((await db.query('select * from public.catalogo_publico_combos')).rows.length === 1);
  for (const tabla of [...privadas, 'creadores_autorizados']) {
    await assert.rejects(() => db.query(`select * from public.${tabla}`), (error) => error.code === '42501'); comprobaciones += 1;
  }
  await assert.rejects(() => db.exec("insert into public.catalogo_publico_combos(id,nombre) values ('C2','Intruso')"), (error) => error.code === '42501'); comprobaciones += 1;
  console.log(`OK: ${comprobaciones} comprobaciones PostgreSQL aisladas: instalación sin grants automáticos, RLS, pagos, numeración, parámetros, respaldo, Excel, concurrencia y rollback.`);
} finally { await db.close(); }
