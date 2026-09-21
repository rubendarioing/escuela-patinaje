create table training_schedules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  program_id uuid not null references programs(id),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  max_capacity integer not null check (max_capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_schedules_time_range check (start_time < end_time)
);

-- day_of_week: 1 = lunes ... 7 = domingo

create index training_schedules_venue_idx on training_schedules (venue_id);
create index training_schedules_program_idx on training_schedules (program_id);
create index training_schedules_day_idx on training_schedules (day_of_week);

create trigger training_schedules_set_updated_at
  before update on training_schedules
  for each row execute function set_updated_at();

alter table training_schedules enable row level security;

-- Público: un horario es visible solo si él, su sede y su programa están activos
create policy "training_schedules_public_read" on training_schedules
  for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from venues v where v.id = venue_id and v.is_active)
    and exists (select 1 from programs p where p.id = program_id and p.is_active)
  );

-- Staff: ve todo
create policy "training_schedules_staff_read" on training_schedules
  for select to authenticated
  using ((select is_staff()));

create policy "training_schedules_staff_insert" on training_schedules
  for insert to authenticated
  with check ((select is_staff()));

create policy "training_schedules_staff_update" on training_schedules
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No hay política DELETE (decisión D9)
