-- La llave foránea training_schedules -> venue_programs solo exige que la
-- relación exista. Quitar un programa de una sede la desactiva (no la borra),
-- así que además hay que exigir que esté activa al crear un horario o al
-- cambiarle la sede o el programa. Los horarios existentes de un programa
-- desactivado se pueden seguir editando en sus demás campos.
create or replace function check_schedule_venue_program_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.venue_id = old.venue_id
     and new.program_id = old.program_id then
    return null;
  end if;

  if not exists (
    select 1 from venue_programs
    where venue_id = new.venue_id
      and program_id = new.program_id
      and is_active
  ) then
    -- Mismo código que la llave foránea, para que el frontend lo trate igual
    raise exception 'La sede no ofrece ese programa'
      using errcode = 'foreign_key_violation';
  end if;

  return null;
end;
$$;

-- AFTER: así RLS se evalúa primero y un usuario sin permisos sigue
-- recibiendo el error de permisos, no este
create trigger training_schedules_venue_program_active
  after insert or update of venue_id, program_id on training_schedules
  for each row execute function check_schedule_venue_program_active();
