create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  level text
    check (level is null or level in ('initiation', 'beginner', 'intermediate', 'advanced', 'competition')),
  min_age smallint check (min_age is null or min_age >= 0),
  max_age smallint check (max_age is null or max_age >= 0),
  sort_order smallint not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint programs_age_range check (min_age is null or max_age is null or min_age <= max_age)
);

create index programs_is_active_idx on programs (is_active, sort_order);

create trigger programs_set_updated_at
  before update on programs
  for each row execute function set_updated_at();

alter table programs enable row level security;

-- Público: solo programas activos
create policy "programs_public_read" on programs
  for select to anon, authenticated
  using (is_active);

-- Staff: ve todo
create policy "programs_staff_read" on programs
  for select to authenticated
  using ((select is_staff()));

create policy "programs_staff_insert" on programs
  for insert to authenticated
  with check ((select is_staff()));

create policy "programs_staff_update" on programs
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No hay política DELETE (decisión D9)
