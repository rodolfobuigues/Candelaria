-- Esquema inicial de Candelaria para Supabase.
-- Para instalaciones nuevas. En una base existente aplicar las migraciones;
-- no volver a ejecutar el esquema. Completar con seguridad_datos.sql y
-- autorizar explícitamente el UUID del creador antes de habilitar el panel.

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

create table if not exists public.insumos (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  categoria text not null default '',
  unidad text not null,
  monto_compra numeric not null default 0,
  cantidad_compra numeric not null default 1,
  activo boolean not null default true,
  rol_motor text,
  updated_at timestamptz not null default now()
);

create table if not exists public.productos (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  categoria text not null,
  cera_alto_pf numeric not null default 0,
  cera_bajo_pf numeric not null default 0,
  pabilo numeric not null default 0,
  yeso numeric not null default 0,
  minutos_mano_obra numeric not null default 0,
  recipiente_costo numeric not null default 0,
  recipiente_cantidad numeric not null default 0,
  hereda_costo_de text,
  extras jsonb not null default '[]'::jsonb,
  fotos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.combos (
  id text primary key,
  nombre text not null,
  nombre_comercial text not null default '',
  descripcion_comercial text not null default '',
  lineas jsonb not null default '[]'::jsonb,
  fotos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Proyección pública: contiene únicamente datos comerciales de combos. La
-- aplicación autenticada la recalcula con el mismo motor de precios del panel.
create table if not exists public.catalogo_publico_combos (
  id text primary key,
  nombre text not null,
  descripcion text not null default '',
  precio numeric not null default 0,
  telefono_comercial text not null default '',
  fotos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.parametros (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id text primary key,
  numero integer not null unique,
  revision integer not null default 0,
  fecha timestamptz not null,
  cliente_nombre text not null,
  cliente_telefono text not null default '',
  nota_interna text not null default '',
  estado_entrega text not null default 'PENDIENTE',
  lineas jsonb not null default '[]'::jsonb,
  pagos jsonb not null default '[]'::jsonb,
  historial jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.insumos enable row level security;
alter table public.productos enable row level security;
alter table public.combos enable row level security;
alter table public.catalogo_publico_combos enable row level security;
alter table public.parametros enable row level security;
alter table public.pedidos enable row level security;

-- Catálogo público: sólo la proyección comercial, nunca recetas ni costos.
create policy "publico lee combos publicados" on public.catalogo_publico_combos
  for select to anon, authenticated using (activo = true);

-- Panel privado: solo UUIDs autorizados explícitamente desde SQL Editor.
create policy "creador administra insumos" on public.insumos
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
create policy "creador administra productos" on public.productos
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
create policy "creador administra combos" on public.combos
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
create policy "creador administra catalogo publico" on public.catalogo_publico_combos
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
create policy "creador administra parametros" on public.parametros
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());
create policy "creador administra pedidos" on public.pedidos
  for all to authenticated using (public.es_creador_autorizado()) with check (public.es_creador_autorizado());

-- Permisos explícitos para instalaciones sin grants automáticos de Supabase.
-- RLS sigue restringiendo estas operaciones al creador autorizado.
-- No dar acceso anónimo ni exponer creadores_autorizados.
grant select, insert, update, delete
on table public.insumos, public.productos, public.combos,
         public.parametros, public.pedidos
to authenticated;

insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

create policy "publico ve fotos del catalogo" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'catalogo');
create policy "creador carga fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalogo' and public.es_creador_autorizado());
create policy "creador actualiza fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo' and public.es_creador_autorizado()) with check (bucket_id = 'catalogo' and public.es_creador_autorizado());
create policy "creador elimina fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogo' and public.es_creador_autorizado());

grant select on public.catalogo_publico_combos to anon, authenticated;
grant insert, update, delete on public.catalogo_publico_combos to authenticated;
