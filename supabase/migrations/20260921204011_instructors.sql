create table instructors (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  bio text,
  photo_url text,
  specialty text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructors_email_format
    check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index instructors_is_active_idx on instructors (is_active);

create trigger instructors_set_updated_at
  before update on instructors
  for each row execute function set_updated_at();

alter table instructors enable row level security;

-- Público (anon): solo columnas seguras. RLS filtra filas, los grants filtran columnas.
revoke all on instructors from anon;

grant select (id, first_name, last_name, specialty, bio, photo_url, is_active)
  on instructors to anon;

create policy "instructors_public_read" on instructors
  for select to anon
  using (is_active);

-- Staff: acceso completo excepto borrar
create policy "instructors_staff_read" on instructors
  for select to authenticated
  using ((select is_staff()));

create policy "instructors_staff_insert" on instructors
  for insert to authenticated
  with check ((select is_staff()));

create policy "instructors_staff_update" on instructors
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No hay política DELETE (decisión D9)
