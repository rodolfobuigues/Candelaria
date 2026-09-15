-- Instalación no destructiva. Este archivo crea una función: NO importa datos.
-- Ejecutar una vez en el SQL Editor. La función solo se llama al confirmar una
-- revisión Excel desde Ajustes; todo se confirma o revierte en una transacción.
begin;
create or replace function public.aplicar_intercambio_excel(p_estado jsonb, p_cambios jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actual jsonb;
  fila jsonb;
  clave text;
  nuevos integer := 0;
  modificados integer := 0;
begin
  if auth.uid() is null then raise exception 'Se requiere la sesión del creador.'; end if;
  if jsonb_typeof(p_estado) <> 'object' or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Formato de importación no admitido.';
  end if;
  if exists (select 1 from jsonb_object_keys(p_cambios) k where k not in ('insumos', 'productos', 'combos', 'parametros')) then
    raise exception 'La importación no puede modificar pedidos ni otras tablas.';
  end if;
  foreach clave in array array['insumos', 'productos', 'combos', 'parametros'] loop
    if jsonb_typeof(p_cambios -> clave) is distinct from 'array' or jsonb_typeof(p_estado -> clave) is distinct from 'object' then
      raise exception 'Falta la colección %.', clave;
    end if;
  end loop;

  -- Excluye otras escrituras hasta finalizar; después compara todos los datos
  -- usados en la previsualización, incluidas fotos, extras y parámetros.
  lock table public.insumos, public.productos, public.combos, public.parametros in share row exclusive mode;
  select jsonb_build_object(
    'insumos', coalesce((select jsonb_object_agg(i.id, to_jsonb(i) - 'updated_at') from public.insumos i), '{}'::jsonb),
    'productos', coalesce((select jsonb_object_agg(p.id, to_jsonb(p) - 'updated_at') from public.productos p), '{}'::jsonb),
    'combos', coalesce((select jsonb_object_agg(c.id, to_jsonb(c) - 'updated_at') from public.combos c), '{}'::jsonb),
    'parametros', coalesce((select jsonb_object_agg(p.id, to_jsonb(p) - 'updated_at') from public.parametros p), '{}'::jsonb)
  ) into actual;
  if actual is distinct from p_estado then
    raise exception 'Los datos cambiaron desde la revisión. Volvé a revisar el archivo; no se aplicó ningún cambio.';
  end if;

  foreach clave in array array['insumos', 'productos', 'combos', 'parametros'] loop
    for fila in select value from jsonb_array_elements(p_cambios -> clave) loop
      if nullif(fila ->> 'id', '') is null then raise exception 'Falta un id en %.', clave; end if;
      if p_estado -> clave ? (fila ->> 'id') then modificados := modificados + 1;
      else nuevos := nuevos + 1; end if;
    end loop;
  end loop;

  for fila in select value from jsonb_array_elements(p_cambios -> 'insumos') loop
    insert into public.insumos (id, codigo, nombre, categoria, unidad, monto_compra, cantidad_compra, activo)
    values (fila ->> 'id', fila ->> 'codigo', fila ->> 'nombre', fila ->> 'categoria', fila ->> 'unidad', (fila ->> 'monto_compra')::numeric, (fila ->> 'cantidad_compra')::numeric, (fila ->> 'activo')::boolean)
    on conflict (id) do update set codigo = excluded.codigo, nombre = excluded.nombre, categoria = excluded.categoria, unidad = excluded.unidad, monto_compra = excluded.monto_compra, cantidad_compra = excluded.cantidad_compra, activo = excluded.activo, updated_at = now();
  end loop;
  for fila in select value from jsonb_array_elements(p_cambios -> 'productos') loop
    insert into public.productos (id, codigo, nombre, categoria, cera_alto_pf, cera_bajo_pf, pabilo, yeso, minutos_mano_obra, recipiente_costo, recipiente_cantidad, hereda_costo_de, extras, fotos, activo)
    values (fila ->> 'id', fila ->> 'codigo', fila ->> 'nombre', fila ->> 'categoria', (fila ->> 'cera_alto_pf')::numeric, (fila ->> 'cera_bajo_pf')::numeric, (fila ->> 'pabilo')::numeric, (fila ->> 'yeso')::numeric, (fila ->> 'minutos_mano_obra')::numeric, (fila ->> 'recipiente_costo')::numeric, (fila ->> 'recipiente_cantidad')::numeric, fila ->> 'hereda_costo_de', fila -> 'extras', fila -> 'fotos', (fila ->> 'activo')::boolean)
    on conflict (id) do update set codigo = excluded.codigo, nombre = excluded.nombre, categoria = excluded.categoria, cera_alto_pf = excluded.cera_alto_pf, cera_bajo_pf = excluded.cera_bajo_pf, pabilo = excluded.pabilo, yeso = excluded.yeso, minutos_mano_obra = excluded.minutos_mano_obra, recipiente_costo = excluded.recipiente_costo, recipiente_cantidad = excluded.recipiente_cantidad, hereda_costo_de = excluded.hereda_costo_de, extras = excluded.extras, fotos = excluded.fotos, activo = excluded.activo, updated_at = now();
  end loop;
  for fila in select value from jsonb_array_elements(p_cambios -> 'combos') loop
    insert into public.combos (id, nombre, lineas, fotos, activo)
    values (fila ->> 'id', fila ->> 'nombre', fila -> 'lineas', fila -> 'fotos', (fila ->> 'activo')::boolean)
    on conflict (id) do update set nombre = excluded.nombre, lineas = excluded.lineas, fotos = excluded.fotos, activo = excluded.activo, updated_at = now();
  end loop;
  for fila in select value from jsonb_array_elements(p_cambios -> 'parametros') loop
    if fila ->> 'id' <> 'actuales' then raise exception 'Solo se pueden importar parámetros de cálculo.'; end if;
    insert into public.parametros (id, datos) values (fila ->> 'id', fila -> 'datos')
    on conflict (id) do update set datos = excluded.datos, updated_at = now();
  end loop;
  return jsonb_build_object('nuevos', nuevos, 'modificados', modificados);
end;
$$;
revoke all on function public.aplicar_intercambio_excel(jsonb, jsonb) from public, anon;
grant execute on function public.aplicar_intercambio_excel(jsonb, jsonb) to authenticated;
commit;
