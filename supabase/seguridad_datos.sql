-- Migración no destructiva. NO ejecuta importaciones ni cambia recetas.
-- Instalar DESPUÉS de verificar el UUID del creador en Authentication.
-- En la MISMA sesión, antes de ejecutar este archivo:
-- set candelaria.creador_id = 'UUID_CONFIRMADO';
-- Sin un creador autorizado la transacción falla y revierte.
begin;

create table if not exists public.creadores_autorizados (
  usuario_id uuid primary key references auth.users(id),
  creado_en timestamptz not null default now()
);
alter table public.creadores_autorizados enable row level security;
revoke all on public.creadores_autorizados from anon, authenticated;

create or replace function public.es_creador_autorizado()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.creadores_autorizados where usuario_id = auth.uid()); $$;
revoke all on function public.es_creador_autorizado() from public;
grant execute on function public.es_creador_autorizado() to anon, authenticated;

alter table public.insumos add column if not exists rol_motor text;
update public.insumos set rol_motor = null where rol_motor = '';
create unique index if not exists insumos_rol_motor_unico on public.insumos(rol_motor) where rol_motor is not null;
alter table public.combos add column if not exists nombre_comercial text not null default '';
alter table public.combos add column if not exists descripcion_comercial text not null default '';
alter table public.catalogo_publico_combos add column if not exists telefono_comercial text not null default '';
alter table public.pedidos add column if not exists revision integer not null default 0;

-- NOT VALID preserva filas históricas. Las nuevas escrituras sí se controlan.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'insumos_dominio_seguro') then
    alter table public.insumos add constraint insumos_dominio_seguro check (
      btrim(codigo) <> '' and btrim(nombre) <> '' and monto_compra >= 0 and cantidad_compra > 0
      and monto_compra::text not in ('NaN','Infinity','-Infinity') and cantidad_compra::text not in ('NaN','Infinity','-Infinity')
      and (rol_motor is null or rol_motor in ('ceraAltoPF','ceraBajoPF','pabilo','yeso','esencia','colorante','aceiteCoco'))
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'productos_dominio_seguro') then
    alter table public.productos add constraint productos_dominio_seguro check (
      btrim(codigo) <> '' and btrim(nombre) <> '' and cera_alto_pf >= 0 and cera_bajo_pf >= 0 and pabilo >= 0 and yeso >= 0
      and minutos_mano_obra >= 0 and recipiente_costo >= 0 and recipiente_cantidad >= 0
      and cera_alto_pf::text not in ('NaN','Infinity','-Infinity') and cera_bajo_pf::text not in ('NaN','Infinity','-Infinity')
      and pabilo::text not in ('NaN','Infinity','-Infinity') and yeso::text not in ('NaN','Infinity','-Infinity')
      and minutos_mano_obra::text not in ('NaN','Infinity','-Infinity') and recipiente_costo::text not in ('NaN','Infinity','-Infinity') and recipiente_cantidad::text not in ('NaN','Infinity','-Infinity')
      and jsonb_typeof(extras) = 'array' and jsonb_typeof(fotos) = 'array'
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_dominio_seguro') then
    alter table public.pedidos add constraint pedidos_dominio_seguro check (
      numero > 0 and revision >= 0 and btrim(cliente_nombre) <> '' and estado_entrega in ('PENDIENTE','ENTREGADO')
      and jsonb_typeof(lineas) = 'array' and jsonb_typeof(pagos) = 'array' and jsonb_typeof(historial) = 'array'
    ) not valid;
  end if;
end $$;

-- Sustituye las políticas antiguas que admitían a cualquier autenticado.
do $$ declare tabla text; begin
  foreach tabla in array array['insumos','productos','combos','parametros','pedidos'] loop
    execute format('drop policy if exists %I on public.%I', 'creador administra ' || tabla, tabla);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado())', 'creador administra ' || tabla, tabla);
  end loop;
end $$;
drop policy if exists "creador administra catalogo publico" on public.catalogo_publico_combos;
create policy "creador administra catalogo publico" on public.catalogo_publico_combos for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
drop policy if exists "creador carga fotos" on storage.objects;
drop policy if exists "creador actualiza fotos" on storage.objects;
drop policy if exists "creador elimina fotos" on storage.objects;
create policy "creador carga fotos" on storage.objects for insert to authenticated with check (bucket_id = 'catalogo' and public.es_creador_autorizado());
create policy "creador actualiza fotos" on storage.objects for update to authenticated using (bucket_id = 'catalogo' and public.es_creador_autorizado()) with check (bucket_id = 'catalogo' and public.es_creador_autorizado());
create policy "creador elimina fotos" on storage.objects for delete to authenticated using (bucket_id = 'catalogo' and public.es_creador_autorizado());

-- Validación adicional en servidor: el cliente nunca es la frontera de permisos.
create or replace function public.validar_pedido_seguro(p jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp
as $$ declare linea jsonb; pago jsonb; bruto numeric := 0; pagado numeric := 0; total numeric; begin
  if jsonb_typeof(p->'lineas') is distinct from 'array' or jsonb_typeof(p->'pagos') is distinct from 'array' or jsonb_typeof(p->'historial') is distinct from 'array' then raise exception 'Listas del pedido inválidas.'; end if;
  for linea in select value from jsonb_array_elements(p->'lineas') loop
    if linea->>'tipo' not in ('PRODUCTO','INSUMO','COMBO') or nullif(linea->>'refId','') is null
      or (linea->>'cantidad')::numeric <= 0 or (linea->>'precioAplicado')::numeric < 0
      or (linea->>'precioOriginal')::numeric < 0
      or jsonb_typeof(linea->'cantidad') is distinct from 'number' or jsonb_typeof(linea->'precioAplicado') is distinct from 'number' or jsonb_typeof(linea->'precioOriginal') is distinct from 'number'
      or (linea->>'cantidad') in ('NaN','Infinity','-Infinity') or (linea->>'precioAplicado') in ('NaN','Infinity','-Infinity') or (linea->>'precioOriginal') in ('NaN','Infinity','-Infinity') then raise exception 'Componente del pedido inválido.'; end if;
    bruto := bruto + (linea->>'cantidad')::numeric * (linea->>'precioAplicado')::numeric;
  end loop;
  for pago in select value from jsonb_array_elements(p->'pagos') loop
    if nullif(pago->>'id','') is null or (pago->>'monto')::numeric <= 0 or jsonb_typeof(pago->'anulado') is distinct from 'boolean'
      or jsonb_typeof(pago->'monto') is distinct from 'number' or nullif(pago->>'fecha','') is null or (pago->>'monto') in ('NaN','Infinity','-Infinity') then raise exception 'Pago inválido.'; end if;
    perform (pago->>'fecha')::timestamptz;
    if not (pago->>'anulado')::boolean then pagado := pagado + (pago->>'monto')::numeric; end if;
  end loop;
  if (select count(*) <> count(distinct value->>'id') from jsonb_array_elements(p->'pagos')) then raise exception 'Pago duplicado.'; end if;
  total := case when bruto > 1000 then ceil(bruto / 100) * 100 else floor(bruto / 10 + 0.5) * 10 end;
  if pagado > total then raise exception 'Los pagos superan el total del pedido.'; end if;
end $$;

create or replace function public.guardar_pedido_seguro(p_pedido jsonb, p_revision integer, p_nuevo boolean default false)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp
as $$ declare actual public.pedidos; destino public.pedidos; numero_nuevo integer; begin
  if not public.es_creador_autorizado() then raise exception 'Se requiere la sesión del creador autorizado.'; end if;
  lock table public.pedidos in share row exclusive mode;
  select * into actual from public.pedidos where id = p_pedido->>'id';
  if p_nuevo then
    if found then raise exception 'Este pedido ya fue guardado. Volvé a la lista de pedidos.'; end if;
    select coalesce(max(numero),0) + 1 into numero_nuevo from public.pedidos;
    p_pedido := p_pedido || jsonb_build_object('numero',numero_nuevo,'revision',0);
    p_pedido := jsonb_set(p_pedido, '{historial}', coalesce((select jsonb_agg(case when e->>'tipo' = 'CREADO' then e || jsonb_build_object('descripcion', format('Pedido #%s creado para %s.',numero_nuevo,p_pedido->>'cliente_nombre')) else e end) from jsonb_array_elements(p_pedido->'historial') e),'[]'::jsonb));
  elsif actual.id is null or actual.revision is distinct from p_revision then
    raise exception 'El pedido cambió en otra sesión. Volvé a abrirlo y revisá los pagos antes de reintentar; no se perdió ningún pago guardado.';
  else p_pedido := p_pedido || jsonb_build_object('revision',actual.revision+1); end if;
  perform public.validar_pedido_seguro(p_pedido);
  select * into destino from jsonb_populate_record(null::public.pedidos, p_pedido || jsonb_build_object('updated_at',now()));
  if p_nuevo then insert into public.pedidos select destino.*;
  else update public.pedidos set numero=destino.numero,fecha=destino.fecha,cliente_nombre=destino.cliente_nombre,cliente_telefono=destino.cliente_telefono,nota_interna=destino.nota_interna,estado_entrega=destino.estado_entrega,lineas=destino.lineas,pagos=destino.pagos,historial=destino.historial,revision=destino.revision,updated_at=now() where id=destino.id; end if;
  return to_jsonb(destino) - 'updated_at';
end $$;
revoke all on function public.guardar_pedido_seguro(jsonb,integer,boolean) from public, anon;
grant execute on function public.guardar_pedido_seguro(jsonb,integer,boolean) to authenticated;

create or replace function public.restaurar_respaldo_seguro(p_estado jsonb, p_destino jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp
as $$ declare actual jsonb := '{}'::jsonb; tabla text; filas jsonb; fila jsonb; begin
  if not public.es_creador_autorizado() then raise exception 'Se requiere la sesión del creador autorizado.'; end if;
  if jsonb_typeof(p_estado) is distinct from 'object' or jsonb_typeof(p_destino) is distinct from 'object' then raise exception 'Formato de respaldo inválido.'; end if;
  lock table public.insumos,public.productos,public.combos,public.parametros,public.pedidos in share row exclusive mode;
  foreach tabla in array array['insumos','productos','combos','parametros','pedidos'] loop
    if jsonb_typeof(p_estado->tabla) is distinct from 'object' or jsonb_typeof(p_destino->tabla) is distinct from 'array' then raise exception 'Falta la colección %.',tabla; end if;
    execute format('select coalesce(jsonb_object_agg(t.id,to_jsonb(t)-''updated_at''),''{}''::jsonb) from public.%I t',tabla) into filas;
    actual := actual || jsonb_build_object(tabla,filas);
  end loop;
  if actual is distinct from p_estado then raise exception 'Los datos cambiaron durante la preparación del respaldo. Volvé a revisar; no se modificó ningún dato.'; end if;
  for fila in select value from jsonb_array_elements(p_destino->'pedidos') loop perform public.validar_pedido_seguro(fila); end loop;
  foreach tabla in array array['insumos','productos','combos','parametros','pedidos'] loop
    execute format('delete from public.%I',tabla);
    for fila in select value from jsonb_array_elements(p_destino->tabla) loop
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)',tabla,tabla) using fila || jsonb_build_object('updated_at',now());
    end loop;
  end loop;
end $$;
revoke all on function public.restaurar_respaldo_seguro(jsonb,jsonb) from public, anon;
grant execute on function public.restaurar_respaldo_seguro(jsonb,jsonb) to authenticated;

-- Impide que una llamada directa a REST saltee validaciones de parámetros/pagos.
create or replace function public.validar_escritura_dominio()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$ declare k text; v numeric; begin
  if tg_table_name = 'pedidos' then perform public.validar_pedido_seguro(to_jsonb(new)); end if;
  if tg_table_name = 'parametros' and new.id = 'actuales' then
    foreach k in array array['beneficio','factorGastos','redondeo','costoHoraManoObra','porcentajeEsencia','mlColorantePorGramoCera','unidadesCocoPorGramoCera'] loop
      if jsonb_typeof(new.datos->k) is distinct from 'number' then raise exception 'Parámetro inválido: %.',k; end if;
      v := (new.datos->>k)::numeric;
      if v < 0 or v::text in ('NaN','Infinity','-Infinity') or (k in ('factorGastos','redondeo') and v < 1) or (k='redondeo' and v<>trunc(v)) or (k='porcentajeEsencia' and v>100) then raise exception 'Parámetro inválido: %.',k; end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists pedidos_validacion_dominio on public.pedidos;
create trigger pedidos_validacion_dominio before insert or update on public.pedidos for each row execute function public.validar_escritura_dominio();
drop trigger if exists parametros_validacion_dominio on public.parametros;
create trigger parametros_validacion_dominio before insert or update on public.parametros for each row execute function public.validar_escritura_dominio();

do $$ declare creador text := current_setting('candelaria.creador_id', true); begin
  if nullif(creador, '') is not null then
    insert into public.creadores_autorizados(usuario_id) values (creador::uuid) on conflict do nothing;
  end if;
  if not exists (select 1 from public.creadores_autorizados) then
    raise exception 'No se confirmó el creador. Configurá candelaria.creador_id con el UUID verificado antes de instalar.';
  end if;
end $$;

commit;
