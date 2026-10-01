-- Cantidad exacta de horarios que debe elegir un deportista al inscribirse
-- en una sede. Configurable por sede desde el admin.
alter table venues
  add column schedules_per_athlete smallint not null default 3
  constraint venues_schedules_per_athlete_range check (schedules_per_athlete between 1 and 7);

-- Estado de cada programa en cada sede: cuántos horarios activos tiene y si
-- ya se puede publicar en la inscripción. Un programa es publicable en una
-- sede cuando la sede, el programa y la relación están activos y tiene al
-- menos schedules_per_athlete horarios activos.
-- Corre con los permisos de quien llama: el público solo ve lo público
-- (RLS) y el staff ve todo, incluidos los programas no publicables.
create or replace function get_venue_program_status()
returns table (
  venue_id uuid,
  program_id uuid,
  required_schedules smallint,
  active_schedules integer,
  is_publishable boolean
)
language sql
stable
set search_path = public
as $$
  select
    vp.venue_id,
    vp.program_id,
    v.schedules_per_athlete,
    coalesce(s.cnt, 0)::integer,
    (vp.is_active and v.is_active and p.is_active
      and coalesce(s.cnt, 0) >= v.schedules_per_athlete)
  from venue_programs vp
  join venues v on v.id = vp.venue_id
  join programs p on p.id = vp.program_id
  left join (
    select ts.venue_id, ts.program_id, count(*) as cnt
    from training_schedules ts
    where ts.is_active
    group by ts.venue_id, ts.program_id
  ) s on s.venue_id = vp.venue_id and s.program_id = vp.program_id;
$$;

revoke all on function get_venue_program_status() from public;
grant execute on function get_venue_program_status() to anon, authenticated;
