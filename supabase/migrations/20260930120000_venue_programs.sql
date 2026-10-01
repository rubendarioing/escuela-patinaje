-- Programas que ofrece cada sede. Una sede puede tener programas sin horarios
-- todavía (el admin los agrega después) y un programa del catálogo puede
-- ofrecerse en varias sedes.
create table venue_programs (
  venue_id uuid not null references venues(id),
  program_id uuid not null references programs(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (venue_id, program_id)
);

create index venue_programs_program_idx on venue_programs (program_id);

create trigger venue_programs_set_updated_at
  before update on venue_programs
  for each row execute function set_updated_at();

alter table venue_programs enable row level security;

-- Público: solo la relación activa, con sede y programa activos
create policy "venue_programs_public_read" on venue_programs
  for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from venues v where v.id = venue_id and v.is_active)
    and exists (select 1 from programs p where p.id = program_id and p.is_active)
  );

-- Staff: ve todo
create policy "venue_programs_staff_read" on venue_programs
  for select to authenticated
  using ((select is_staff()));

create policy "venue_programs_staff_insert" on venue_programs
  for insert to authenticated
  with check ((select is_staff()));

create policy "venue_programs_staff_update" on venue_programs
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No hay política DELETE: se desactiva con is_active (decisión D9)

-- Cargar las relaciones que ya existen a través de los horarios
insert into venue_programs (venue_id, program_id)
select distinct venue_id, program_id from training_schedules
on conflict do nothing;

-- Un horario solo puede crearse para un programa que la sede ofrece
alter table training_schedules
  add constraint training_schedules_venue_program_fkey
  foreign key (venue_id, program_id) references venue_programs (venue_id, program_id);

-- El público tampoco ve horarios de un programa desactivado en esa sede
drop policy "training_schedules_public_read" on training_schedules;

create policy "training_schedules_public_read" on training_schedules
  for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from venues v where v.id = venue_id and v.is_active)
    and exists (select 1 from programs p where p.id = program_id and p.is_active)
    and exists (
      select 1 from venue_programs vp
      where vp.venue_id = training_schedules.venue_id
        and vp.program_id = training_schedules.program_id
        and vp.is_active
    )
  );

-- Sincroniza los programas de una sede en una sola operación: activa los
-- elegidos (creándolos si no existen) y desactiva los demás.
-- Corre con los permisos de quien llama, así que RLS limita al staff.
create or replace function set_venue_programs(p_venue_id uuid, p_program_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into venue_programs (venue_id, program_id, is_active)
  select p_venue_id, unnest(p_program_ids), true
  on conflict (venue_id, program_id) do update set is_active = true;

  update venue_programs
  set is_active = false
  where venue_id = p_venue_id
    and is_active
    and not (program_id = any (p_program_ids));
end;
$$;

revoke all on function set_venue_programs(uuid, uuid[]) from public, anon;
grant execute on function set_venue_programs(uuid, uuid[]) to authenticated;
