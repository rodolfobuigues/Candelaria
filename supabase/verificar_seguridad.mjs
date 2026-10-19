// PostgreSQL aislado en memoria. No usa URL, credenciales ni datos de Supabase.
// Uso: node supabase/verificar_seguridad.mjs [URL del módulo PGlite]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
const CREADOR = '00000000-0000-4000-8000-000000000001';
const OTRO = '00000000-0000-4000-8000-000000000002';
let comprobaciones = 0;
const comprobar = (valor) => { assert.ok(valor); comprobaciones += 1; };
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
  `);
  await db.exec(`insert into auth.users values ('${CREADOR}'),('${OTRO}'); set candelaria.creador_id='${CREADOR}';`);
  for (const archivo of ['schema.sql', 'seguridad_datos.sql', 'intercambio_excel.sql']) await db.exec(await readFile(new URL(archivo, import.meta.url), 'utf8'));
  await db.exec(`grant select,insert,update,delete on public.insumos,public.productos,public.combos,public.parametros,public.pedidos,storage.objects to authenticated;
    insert into public.creadores_autorizados(usuario_id) values ('${CREADOR}') on conflict do nothing;
    set role authenticated; set request.jwt.claim.sub='${CREADOR}';
    insert into public.insumos(id,codigo,nombre,unidad,monto_compra,cantidad_compra) values ('M1','M1','Cera de prueba','g',100,1);`);
  comprobar((await db.query('select * from public.insumos')).rows.length === 1);
  await db.exec(`set request.jwt.claim.sub='${OTRO}'`);
  comprobar((await db.query('select * from public.insumos')).rows.length === 0);
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
  await db.exec("reset role; insert into public.catalogo_publico_combos(id,nombre,precio) values ('C1','Comercial',100); set role anon; set request.jwt.claim.sub=''");
  comprobar((await db.query('select * from public.catalogo_publico_combos')).rows.length === 1);
  await assert.rejects(() => db.query('select * from public.insumos'), /permission denied/); comprobaciones += 1;
  console.log(`OK: ${comprobaciones} comprobaciones PostgreSQL aisladas: permisos, pagos, numeración, parámetros, respaldo, concurrencia y rollback.`);
} finally { await db.close(); }
