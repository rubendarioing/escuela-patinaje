create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text not null,
  city text,
  description text,
  phone text,
  whatsapp text,
  google_maps_url text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index venues_is_active_idx on venues (is_active);

create trigger venues_set_updated_at
  before update on venues
  for each row execute function set_updated_at();

alter table venues enable row level security;

-- Público: solo sedes activas
create policy "venues_public_read" on venues
  for select to anon, authenticated
  using (is_active);

-- Staff: ve todo (incluidas las inactivas)
create policy "venues_staff_read" on venues
  for select to authenticated
  using ((select is_staff()));

create policy "venues_staff_insert" on venues
  for insert to authenticated
  with check ((select is_staff()));

create policy "venues_staff_update" on venues
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No hay política DELETE: no se borra físicamente (decisión D9)
