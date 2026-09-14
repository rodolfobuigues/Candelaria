begin;

create table if not exists public.catalogo_publico_combos (
  id text primary key,
  nombre text not null,
  descripcion text not null default '',
  precio numeric not null default 0,
  fotos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.catalogo_publico_combos enable row level security;

drop policy if exists "catalogo publico lee productos activos" on public.productos;
drop policy if exists "catalogo publico lee combos activos" on public.combos;
drop policy if exists "publico lee combos publicados" on public.catalogo_publico_combos;
drop policy if exists "creador administra catalogo publico" on public.catalogo_publico_combos;

create policy "publico lee combos publicados" on public.catalogo_publico_combos
  for select to anon, authenticated using (activo = true);

create policy "creador administra catalogo publico" on public.catalogo_publico_combos
  for all to authenticated using (true) with check (true);

grant select on public.catalogo_publico_combos to anon, authenticated;
grant insert, update, delete on public.catalogo_publico_combos to authenticated;

commit;
