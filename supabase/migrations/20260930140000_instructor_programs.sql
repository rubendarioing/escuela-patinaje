-- Programas a los que pertenece cada instructor (muchos a muchos): un
-- instructor puede dar clase en varios programas y un programa puede tener
-- varios instructores. Un instructor solo se puede asignar a horarios de sus
-- programas; la sede no lo limita.
create table instructor_programs (
  instructor_id uuid not null references instructors(id),
  program_id uuid not null references programs(id),
  created_at timestamptz not null default now(),
  primary key (instructor_id, program_id)
);

create index instructor_programs_program_idx on instructor_programs (program_id);

alter table instructor_programs enable row level security;

-- Público: solo relaciones de instructores y programas activos
create policy "instructor_programs_public_read" on instructor_programs
  for select to anon, authenticated
  using (
    exists (select 1 from instructors i where i.id = instructor_id and i.is_active)
    and exists (select 1 from programs p where p.id = program_id and p.is_active)
  );

-- Staff: leer, crear y eliminar la asociación (excepción D9, igual que schedule_instructors)
create policy "instructor_programs_staff_read" on instructor_programs
  for select to authenticated
  using ((select is_staff()));

create policy "instructor_programs_staff_insert" on instructor_programs
  for insert to authenticated
  with check ((select is_staff()));

create policy "instructor_programs_staff_delete" on instructor_programs
  for delete to authenticated
  using ((select is_staff()));

-- Cargar las relaciones que ya existen a través de los horarios asignados
insert into instructor_programs (instructor_id, program_id)
select distinct si.instructor_id, s.program_id
from schedule_instructors si
join training_schedules s on s.id = si.schedule_id
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Validaciones. Son triggers AFTER para que RLS se evalúe primero y un
-- usuario sin permisos reciba el error de permisos, no estos.
-- ---------------------------------------------------------------------

-- 1) Un instructor solo se asigna a horarios de sus programas
create or replace function check_schedule_instructor_program()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from training_schedules s
    join instructor_programs ip
      on ip.program_id = s.program_id and ip.instructor_id = new.instructor_id
    where s.id = new.schedule_id
  ) then
    raise exception 'instructor_not_in_program'
      using hint = 'El instructor no pertenece al programa de este horario.';
  end if;
  return null;
end;
$$;

create trigger schedule_instructors_program_check
  after insert or update of schedule_id, instructor_id on schedule_instructors
  for each row execute function check_schedule_instructor_program();

-- 2) Si un horario cambia de programa, sus instructores deben pertenecer al nuevo.
-- Diferido hasta el commit: save_training_schedule cambia el programa antes de
-- reemplazar los instructores, y se debe validar el resultado final.
create or replace function check_schedule_program_instructors()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.program_id = old.program_id then
    return null;
  end if;

  if exists (
    select 1
    from training_schedules s
    join schedule_instructors si on si.schedule_id = s.id
    where s.id = new.id
      and not exists (
        select 1 from instructor_programs ip
        where ip.instructor_id = si.instructor_id and ip.program_id = s.program_id
      )
  ) then
    raise exception 'instructor_not_in_program'
      using hint = 'Algún instructor del horario no pertenece al nuevo programa.';
  end if;
  return null;
end;
$$;

create constraint trigger training_schedules_program_instructors_check
  after update of program_id on training_schedules
  deferrable initially deferred
  for each row execute function check_schedule_program_instructors();

-- 3) No se puede quitar un programa a un instructor que tiene horarios de ese programa
create or replace function check_instructor_program_in_use()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from schedule_instructors si
    join training_schedules s on s.id = si.schedule_id
    where si.instructor_id = old.instructor_id
      and s.program_id = old.program_id
  ) then
    raise exception 'instructor_program_in_use'
      using hint = 'El instructor tiene horarios asignados en ese programa.';
  end if;
  return null;
end;
$$;

create trigger instructor_programs_in_use_check
  after delete on instructor_programs
  for each row execute function check_instructor_program_in_use();

-- ---------------------------------------------------------------------
-- Sincroniza los programas de un instructor en una sola operación.
-- Corre con los permisos de quien llama, así que RLS limita al staff.
-- ---------------------------------------------------------------------
create or replace function set_instructor_programs(p_instructor_id uuid, p_program_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from instructor_programs
  where instructor_id = p_instructor_id
    and not (program_id = any (p_program_ids));

  insert into instructor_programs (instructor_id, program_id)
  select p_instructor_id, unnest(p_program_ids)
  on conflict do nothing;
end;
$$;

revoke all on function set_instructor_programs(uuid, uuid[]) from public, anon;
grant execute on function set_instructor_programs(uuid, uuid[]) to authenticated;
