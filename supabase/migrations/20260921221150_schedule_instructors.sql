create table schedule_instructors (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references training_schedules(id) on delete cascade,
  instructor_id uuid not null references instructors(id),
  role text not null default 'assistant' check (role in ('lead', 'assistant', 'substitute')),
  created_at timestamptz not null default now(),
  unique (schedule_id, instructor_id)
);

-- Un solo instructor principal por horario
create unique index schedule_instructors_one_lead_idx
  on schedule_instructors (schedule_id)
  where role = 'lead';

create index schedule_instructors_instructor_idx on schedule_instructors (instructor_id);

alter table schedule_instructors enable row level security;

-- Público: solo asociaciones de horarios e instructores activos
create policy "schedule_instructors_public_read" on schedule_instructors
  for select to anon, authenticated
  using (
    exists (
      select 1 from training_schedules s
      where s.id = schedule_id and s.is_active
    )
    and exists (
      select 1 from instructors i
      where i.id = instructor_id and i.is_active
    )
  );

-- Staff: leer, crear, editar y eliminar la asociación (excepción D9)
create policy "schedule_instructors_staff_read" on schedule_instructors
  for select to authenticated
  using ((select is_staff()));

create policy "schedule_instructors_staff_insert" on schedule_instructors
  for insert to authenticated
  with check ((select is_staff()));

create policy "schedule_instructors_staff_update" on schedule_instructors
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

create policy "schedule_instructors_staff_delete" on schedule_instructors
  for delete to authenticated
  using ((select is_staff()));
