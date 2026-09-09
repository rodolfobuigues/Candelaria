-- Esquema inicial de Candelaria para Supabase.
-- Ejecutar en el SQL Editor del proyecto Supabase.

create table if not exists public.insumos (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  categoria text not null default '',
  unidad text not null,
  monto_compra numeric not null default 0,
  cantidad_compra numeric not null default 1,
  activo boolean not null default true,
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
  lineas jsonb not null default '[]'::jsonb,
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
alter table public.parametros enable row level security;
alter table public.pedidos enable row level security;

-- Catálogo público: solo registros activos.
create policy "catalogo publico lee productos activos" on public.productos
  for select to anon, authenticated using (activo = true);
create policy "catalogo publico lee combos activos" on public.combos
  for select to anon, authenticated using (activo = true);

-- Panel privado: cualquier usuario autenticado (se creará uno solo al inicio).
create policy "creador administra insumos" on public.insumos
  for all to authenticated using (true) with check (true);
create policy "creador administra productos" on public.productos
  for all to authenticated using (true) with check (true);
create policy "creador administra combos" on public.combos
  for all to authenticated using (true) with check (true);
create policy "creador administra parametros" on public.parametros
  for all to authenticated using (true) with check (true);
create policy "creador administra pedidos" on public.pedidos
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

create policy "publico ve fotos del catalogo" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'catalogo');
create policy "creador carga fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalogo');
create policy "creador actualiza fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo') with check (bucket_id = 'catalogo');
create policy "creador elimina fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogo');
