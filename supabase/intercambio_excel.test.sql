-- Prueba aislada de la función instalada. Solo escribe en pg_temp.
-- No copia datos vigentes. ROLLBACK descarta las tablas y funciones de prueba.
begin;
create temporary table insumos (like public.insumos including all);
create temporary table productos (like public.productos including all);
create temporary table combos (like public.combos including all);
create temporary table parametros (like public.parametros including all);
do $copia$
begin
  execute replace(pg_get_functiondef('public.aplicar_intercambio_excel(jsonb,jsonb)'::regprocedure), 'public.', 'pg_temp.');
end;
$copia$;
create function pg_temp.estado_excel_prueba() returns jsonb language sql as $estado$
  select jsonb_build_object(
    'insumos', coalesce((select jsonb_object_agg(i.id, to_jsonb(i) - 'updated_at') from pg_temp.insumos i), '{}'::jsonb),
    'productos', coalesce((select jsonb_object_agg(p.id, to_jsonb(p) - 'updated_at') from pg_temp.productos p), '{}'::jsonb),
    'combos', coalesce((select jsonb_object_agg(c.id, to_jsonb(c) - 'updated_at') from pg_temp.combos c), '{}'::jsonb),
    'parametros', coalesce((select jsonb_object_agg(p.id, to_jsonb(p) - 'updated_at') from pg_temp.parametros p), '{}'::jsonb)
  );
$estado$;
insert into pg_temp.insumos (id,codigo,nombre,unidad,monto_compra) values ('M1','M1','Prueba aislada','g',1);
insert into pg_temp.productos (id,codigo,nombre,categoria,minutos_mano_obra,fotos,extras)
values ('V1','V1','Prueba aislada','VELA',45,'["https://example.invalid/producto.jpg"]','[{"insumoId":"M1","cantidad":2}]');
insert into pg_temp.combos (id,nombre,fotos,lineas)
values ('C1','Prueba aislada','["https://example.invalid/combo.jpg"]','[{"tipo":"PRODUCTO","refId":"V1","cantidad":2}]');
insert into pg_temp.parametros (id,datos) values ('actuales','{"costoHoraManoObra":7000}');
do $pruebas$
declare
  antes jsonb;
  cambios jsonb;
  vacios jsonb := '{"insumos":[],"productos":[],"combos":[],"parametros":[]}';
  resultado jsonb;
  rechazo boolean;
begin
  antes := pg_temp.estado_excel_prueba();
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  rechazo := false;
  begin
    perform pg_temp.aplicar_intercambio_excel(antes,vacios);
  exception when others then
    if sqlerrm <> 'Se requiere la sesión del creador.' then raise; end if;
    rechazo := true;
  end;
  if not rechazo then raise exception 'Falló protección sin sesión.'; end if;
  -- Identidad sintética únicamente en esta transacción y sobre pg_temp.
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
  resultado := pg_temp.aplicar_intercambio_excel(antes,vacios);
  if resultado <> '{"nuevos":0,"modificados":0}'::jsonb or pg_temp.estado_excel_prueba() <> antes then raise exception 'Falló no-op.'; end if;
  rechazo := false;
  begin
    perform pg_temp.aplicar_intercambio_excel('{"insumos":{},"productos":{},"combos":{},"parametros":{}}',vacios);
  exception when others then
    if sqlerrm not like 'Los datos cambiaron desde la revisión.%' then raise; end if;
    rechazo := true;
  end;
  if not rechazo then raise exception 'Falló control de concurrencia.'; end if;
  rechazo := false;
  begin
    perform pg_temp.aplicar_intercambio_excel(antes,vacios || '{"pedidos":[]}');
  exception when others then
    if sqlerrm <> 'La importación no puede modificar pedidos ni otras tablas.' then raise; end if;
    rechazo := true;
  end;
  if not rechazo then raise exception 'Falló exclusión de pedidos.'; end if;
  cambios := jsonb_build_object(
    'insumos',jsonb_build_array((antes->'insumos'->'M1') || '{"monto_compra":2}'),
    'productos',jsonb_build_array((antes->'productos'->'V1') || '{"minutos_mano_obra":30}', (antes->'productos'->'V1') || '{"id":"V2","codigo":"V2"}'),
    'combos',jsonb_build_array((antes->'combos'->'C1') || '{"nombre":"Nombre de prueba modificado"}'),
    'parametros',jsonb_build_array((antes->'parametros'->'actuales') || '{"datos":{"costoHoraManoObra":7100}}')
  );
  resultado := pg_temp.aplicar_intercambio_excel(antes,cambios);
  if resultado <> '{"nuevos":1,"modificados":4}'::jsonb then raise exception 'Fallaron altas/modificaciones: %.',resultado; end if;
  if (select minutos_mano_obra from pg_temp.productos where id='V1') <> 30 then raise exception 'Falló actualización de mano de obra.'; end if;
  if (pg_temp.estado_excel_prueba()->'productos'->'V1'->'fotos') <> (antes->'productos'->'V1'->'fotos') or
     (pg_temp.estado_excel_prueba()->'combos'->'C1'->'fotos') <> (antes->'combos'->'C1'->'fotos') then raise exception 'Falló preservación de fotos.'; end if;
  antes := pg_temp.estado_excel_prueba();
  cambios := vacios || jsonb_build_object('insumos',jsonb_build_array((antes->'insumos'->'M1') || '{"monto_compra":99}',(antes->'insumos'->'M1') || '{"id":"DUPLICADO"}'));
  rechazo := false;
  begin
    perform pg_temp.aplicar_intercambio_excel(antes,cambios);
  exception when unique_violation then rechazo := true;
  end;
  if not rechazo or pg_temp.estado_excel_prueba() <> antes then raise exception 'Falló rollback integral ante segunda escritura inválida.'; end if;
end;
$pruebas$;
rollback;
select 'OK: sesión, no-op, concurrencia, exclusión de pedidos, cuatro tablas, altas, fotos y rollback. Ningún registro vigente modificado.' as resultado;
