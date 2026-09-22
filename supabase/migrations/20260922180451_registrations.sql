create table registrations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id),
  schedule_id uuid not null references training_schedules(id),
  registration_date date not null default current_date,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'active', 'cancelled', 'completed')),
  source text not null default 'admin' check (source in ('admin', 'web_form')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index registrations_open_unique_idx
  on registrations (athlete_id, schedule_id)
  where status in ('pending', 'confirmed', 'active');

create index registrations_schedule_status_idx on registrations (schedule_id, status);
create index registrations_status_idx on registrations (status);
create index registrations_athlete_idx on registrations (athlete_id);

create trigger registrations_set_updated_at
  before update on registrations
  for each row execute function set_updated_at();

alter table registrations enable row level security;

create policy "registrations_staff_read" on registrations
  for select to authenticated using ((select is_staff()));

create policy "registrations_staff_insert" on registrations
  for insert to authenticated with check ((select is_staff()));

create policy "registrations_staff_update" on registrations
  for update to authenticated using ((select is_staff())) with check ((select is_staff()));
