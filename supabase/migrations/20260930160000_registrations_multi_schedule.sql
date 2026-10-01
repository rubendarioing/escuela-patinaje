-- =====================================================================
-- Inscripción = un deportista en una sede con exactamente N horarios.
-- N = venues.schedules_per_athlete al momento de inscribirse, guardado en
-- registrations.required_schedules (si la sede cambia N después, las
-- inscripciones existentes siguen valiendo). Los horarios pueden ser de
-- distintos programas de la misma sede y no pueden cruzarse entre sí.
-- =====================================================================

-- 1) Nueva estructura
alter table registrations
  add column venue_id uuid references venues(id),
  add column required_schedules smallint;

create table registration_schedules (
  registration_id uuid not null references registrations(id) on delete cascade,
  schedule_id uuid not null references training_schedules(id),
  created_at timestamptz not null default now(),
  primary key (registration_id, schedule_id)
);

create index registration_schedules_schedule_idx on registration_schedules (schedule_id);

-- 2) Convertir las inscripciones existentes (una por horario) en inscripciones
-- de un solo horario. Si un deportista tuviera dos abiertas en la misma sede,
-- el índice único de abajo hace fallar la migración en vez de perder datos.
update registrations r
set venue_id = s.venue_id,
    required_schedules = 1
from training_schedules s
where s.id = r.schedule_id;

insert into registration_schedules (registration_id, schedule_id)
select id, schedule_id from registrations;

alter table registrations
  alter column venue_id set not null,
  alter column required_schedules set not null,
  add constraint registrations_required_schedules_range check (required_schedules between 1 and 7);

drop index registrations_open_unique_idx;
drop index registrations_schedule_status_idx;
alter table registrations drop column schedule_id;

-- Una sola inscripción abierta por deportista y sede
create unique index registrations_open_unique_idx
  on registrations (athlete_id, venue_id)
  where status in ('pending', 'confirmed', 'active');

create index registrations_venue_status_idx on registrations (venue_id, status);

-- 3) RLS de registration_schedules: igual que registrations (solo staff)
alter table registration_schedules enable row level security;

create policy "registration_schedules_staff_read" on registration_schedules
  for select to authenticated using ((select is_staff()));

create policy "registration_schedules_staff_insert" on registration_schedules
  for insert to authenticated with check ((select is_staff()));

-- Borrar la asociación permite reemplazar un horario (excepción D9)
create policy "registration_schedules_staff_delete" on registration_schedules
  for delete to authenticated using ((select is_staff()));

-- ---------------------------------------------------------------------
-- 4) Validaciones en la base de datos. Son security definer porque las
-- diferidas se ejecutan al hacer commit, fuera del contexto de quien
-- insertó, y deben poder leer las tablas privadas. Solo leen.
-- ---------------------------------------------------------------------

-- 4a) Cada horario debe ser de la sede de la inscripción
create or replace function check_registration_schedule_venue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from registrations r
    join training_schedules s on s.venue_id = r.venue_id
    where r.id = new.registration_id and s.id = new.schedule_id
  ) then
    raise exception 'different_venues'
      using hint = 'El horario no pertenece a la sede de la inscripción.';
  end if;
  return null;
end;
$$;

create trigger registration_schedules_venue_check
  after insert or update on registration_schedules
  for each row execute function check_registration_schedule_venue();

-- 4b) Exactamente required_schedules horarios y sin cruces entre ellos.
-- Diferida hasta el commit, para poder insertar la inscripción y sus
-- horarios (o reemplazar uno) en pasos dentro de la misma transacción.
create or replace function check_registration_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_required smallint;
  v_count integer;
begin
  if tg_table_name = 'registrations' then
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_id := old.registration_id;
  else
    v_id := new.registration_id;
  end if;

  select required_schedules into v_required from registrations where id = v_id;
  if not found then
    return null; -- la inscripción se borró en la misma transacción
  end if;

  select count(*) into v_count from registration_schedules where registration_id = v_id;
  if v_count <> v_required then
    raise exception 'wrong_schedule_count'
      using hint = format('La inscripción requiere %s horarios y tiene %s.', v_required, v_count);
  end if;

  if exists (
    select 1
    from registration_schedules a
    join training_schedules sa on sa.id = a.schedule_id
    join registration_schedules b
      on b.registration_id = a.registration_id and b.schedule_id > a.schedule_id
    join training_schedules sb on sb.id = b.schedule_id
    where a.registration_id = v_id
      and sa.day_of_week = sb.day_of_week
      and sa.start_time < sb.end_time
      and sb.start_time < sa.end_time
  ) then
    raise exception 'schedule_overlap'
      using hint = 'Dos horarios de la inscripción se cruzan.';
  end if;

  return null;
end;
$$;

create constraint trigger registrations_schedules_check
  after insert or update of required_schedules on registrations
  deferrable initially deferred
  for each row execute function check_registration_schedules();

create constraint trigger registration_schedules_count_check
  after insert or delete on registration_schedules
  deferrable initially deferred
  for each row execute function check_registration_schedules();

-- ---------------------------------------------------------------------
-- 5) Cupos: un horario se ocupa con inscripciones confirmadas o activas
-- ---------------------------------------------------------------------
create or replace function get_schedule_availability()
returns table (
  schedule_id uuid,
  max_capacity integer,
  enrolled_count integer,
  available_spots integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.max_capacity,
    coalesce(e.cnt, 0)::integer as enrolled_count,
    greatest(s.max_capacity - coalesce(e.cnt, 0), 0)::integer as available_spots
  from training_schedules s
  left join (
    select rs.schedule_id, count(*) as cnt
    from registration_schedules rs
    join registrations r on r.id = rs.registration_id
    where r.status in ('confirmed', 'active')
    group by rs.schedule_id
  ) e on e.schedule_id = s.id
  where s.is_active;
$$;

-- ---------------------------------------------------------------------
-- 6) Preinscripción pública con varios horarios (payload.schedule_ids)
-- ---------------------------------------------------------------------
create or replace function submit_preregistration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website text;
  v_consent_accepted boolean;
  v_consent_version text;

  v_athlete_first_name text;
  v_athlete_last_name text;
  v_athlete_birth_date date;

  v_guardian_first_name text;
  v_guardian_last_name text;
  v_guardian_phone text;
  v_guardian_whatsapp text;
  v_guardian_email text;

  v_schedule_ids uuid[];
  v_notes text;

  v_found_count integer;
  v_venue_count integer;
  v_venue_id uuid;
  v_required smallint;

  v_recent_count integer;

  v_guardian_id uuid;
  v_guardian_had_consent boolean;

  v_athlete_id uuid;
  v_athlete_is_new boolean := false;

  v_out_of_range text;
  v_final_notes text;
  v_registration_id uuid;
begin
  -- Extraer y normalizar campos del payload
  v_website := trim(coalesce(payload->>'website', ''));

  -- Regla 1: honeypot. Si viene lleno, responder éxito sin guardar nada.
  if v_website <> '' then
    return jsonb_build_object('ok', true);
  end if;

  v_consent_accepted := coalesce((payload->>'consent_accepted')::boolean, false);
  v_consent_version := trim(coalesce(payload->>'consent_version', ''));

  v_athlete_first_name := trim(coalesce(payload->>'athlete_first_name', ''));
  v_athlete_last_name := trim(coalesce(payload->>'athlete_last_name', ''));
  v_guardian_first_name := trim(coalesce(payload->>'guardian_first_name', ''));
  v_guardian_last_name := trim(coalesce(payload->>'guardian_last_name', ''));
  v_guardian_phone := nullif(trim(coalesce(payload->>'guardian_phone', '')), '');
  v_guardian_whatsapp := nullif(trim(coalesce(payload->>'guardian_whatsapp', '')), '');
  v_guardian_email := nullif(trim(lower(coalesce(payload->>'guardian_email', ''))), '');
  v_notes := trim(coalesce(payload->>'notes', ''));

  begin
    v_athlete_birth_date := (payload->>'athlete_birth_date')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end;

  begin
    select array_agg(elem::uuid) into v_schedule_ids
    from jsonb_array_elements_text(payload->'schedule_ids') as elem;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end;

  -- Regla 2: consentimiento obligatorio
  if not v_consent_accepted then
    return jsonb_build_object('ok', false, 'code', 'consent_required');
  end if;

  -- Regla 3: validaciones de servidor
  if v_athlete_first_name = '' or char_length(v_athlete_first_name) > 100
     or v_athlete_last_name = '' or char_length(v_athlete_last_name) > 100
     or v_guardian_first_name = '' or char_length(v_guardian_first_name) > 100
     or v_guardian_last_name = '' or char_length(v_guardian_last_name) > 100
     or char_length(v_notes) > 1000
     or v_consent_version = '' or char_length(v_consent_version) > 50
     or coalesce(cardinality(v_schedule_ids), 0) = 0
     or cardinality(v_schedule_ids) > 7
     or cardinality(v_schedule_ids) <> (select count(distinct x) from unnest(v_schedule_ids) as x)
  then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end if;

  if v_athlete_birth_date is null
     or v_athlete_birth_date > current_date
     or v_athlete_birth_date < current_date - interval '100 years'
  then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end if;

  if v_guardian_email is null and v_guardian_phone is null and v_guardian_whatsapp is null then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end if;

  if v_guardian_email is not null and v_guardian_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end if;

  if (v_guardian_phone is not null and char_length(v_guardian_phone) > 30)
     or (v_guardian_whatsapp is not null and char_length(v_guardian_whatsapp) > 30)
     or (v_guardian_email is not null and char_length(v_guardian_email) > 200)
  then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
  end if;

  -- Regla 4: todos los horarios existen y están activos, con sede, programa
  -- y relación sede-programa activos
  select count(*), count(distinct s.venue_id), min(s.venue_id::text)::uuid
    into v_found_count, v_venue_count, v_venue_id
  from training_schedules s
  join venues v on v.id = s.venue_id
  join programs p on p.id = s.program_id
  join venue_programs vp on vp.venue_id = s.venue_id and vp.program_id = s.program_id
  where s.id = any (v_schedule_ids)
    and s.is_active
    and v.is_active
    and p.is_active
    and vp.is_active;

  if v_found_count <> cardinality(v_schedule_ids) then
    return jsonb_build_object('ok', false, 'code', 'schedule_not_found');
  end if;

  -- Regla 5: todos de la misma sede
  if v_venue_count <> 1 then
    return jsonb_build_object('ok', false, 'code', 'different_venues');
  end if;

  -- Regla 6: exactamente los horarios que exige la sede
  select schedules_per_athlete into v_required from venues where id = v_venue_id;

  if cardinality(v_schedule_ids) <> v_required then
    return jsonb_build_object('ok', false, 'code', 'wrong_schedule_count');
  end if;

  -- Regla 7: cada programa elegido es publicable en la sede (al menos N horarios activos)
  if exists (
    select 1
    from (select distinct program_id from training_schedules where id = any (v_schedule_ids)) chosen
    where (
      select count(*) from training_schedules s
      where s.venue_id = v_venue_id and s.program_id = chosen.program_id and s.is_active
    ) < v_required
  ) then
    return jsonb_build_object('ok', false, 'code', 'schedule_not_found');
  end if;

  -- Regla 8: los horarios no se cruzan entre sí
  if exists (
    select 1
    from training_schedules a
    join training_schedules b on b.id > a.id
    where a.id = any (v_schedule_ids)
      and b.id = any (v_schedule_ids)
      and a.day_of_week = b.day_of_week
      and a.start_time < b.end_time
      and b.start_time < a.end_time
  ) then
    return jsonb_build_object('ok', false, 'code', 'schedule_overlap');
  end if;

  -- Regla 9: cupo en cada horario (misma lógica que get_schedule_availability)
  if exists (
    select 1
    from training_schedules s
    where s.id = any (v_schedule_ids)
      and s.max_capacity <= (
        select count(*)
        from registration_schedules rs
        join registrations r on r.id = rs.registration_id
        where rs.schedule_id = s.id and r.status in ('confirmed', 'active')
      )
  ) then
    return jsonb_build_object('ok', false, 'code', 'schedule_full');
  end if;

  -- Regla 10: límite de frecuencia por contacto (más de 3 en la última hora)
  select count(*) into v_recent_count
  from registrations r
  join athlete_guardians ag on ag.athlete_id = r.athlete_id
  join guardians g on g.id = ag.guardian_id
  where r.source = 'web_form'
    and r.created_at > now() - interval '1 hour'
    and (
      (v_guardian_email is not null and lower(g.email) = v_guardian_email)
      or (v_guardian_phone is not null and g.phone = v_guardian_phone)
      or (v_guardian_whatsapp is not null and g.whatsapp = v_guardian_whatsapp)
    );

  if v_recent_count >= 3 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  -- Regla 11: acudiente. Reutilizar si existe, sin sobrescribir sus datos.
  select id, (data_consent_at is not null) into v_guardian_id, v_guardian_had_consent
  from guardians
  where (v_guardian_email is not null and lower(email) = v_guardian_email)
     or (v_guardian_phone is not null and phone = v_guardian_phone)
     or (v_guardian_whatsapp is not null and whatsapp = v_guardian_whatsapp)
  order by created_at
  limit 1;

  if v_guardian_id is null then
    insert into guardians (
      first_name, last_name, email, phone, whatsapp,
      source, data_consent_at, data_consent_version
    ) values (
      v_guardian_first_name, v_guardian_last_name, v_guardian_email, v_guardian_phone, v_guardian_whatsapp,
      'web_form', now(), v_consent_version
    )
    returning id into v_guardian_id;
  elsif not v_guardian_had_consent then
    update guardians
    set data_consent_at = now(), data_consent_version = v_consent_version
    where id = v_guardian_id;
  end if;

  -- Regla 12: deportista. Reutilizar si ya está asociado a este acudiente.
  select a.id into v_athlete_id
  from athletes a
  join athlete_guardians ag on ag.athlete_id = a.id
  where ag.guardian_id = v_guardian_id
    and lower(a.first_name) = lower(v_athlete_first_name)
    and lower(a.last_name) = lower(v_athlete_last_name)
    and a.birth_date = v_athlete_birth_date
  limit 1;

  if v_athlete_id is null then
    insert into athletes (first_name, last_name, birth_date, status, source)
    values (v_athlete_first_name, v_athlete_last_name, v_athlete_birth_date, 'prospect', 'web_form')
    returning id into v_athlete_id;
    v_athlete_is_new := true;
  end if;

  -- Regla 13: relación deportista-acudiente
  if v_athlete_is_new then
    insert into athlete_guardians (athlete_id, guardian_id, is_primary)
    values (v_athlete_id, v_guardian_id, true);
  end if;

  -- Regla 14: una sola inscripción abierta por deportista y sede
  if exists (
    select 1 from registrations
    where athlete_id = v_athlete_id
      and venue_id = v_venue_id
      and status in ('pending', 'confirmed', 'active')
  ) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_registration');
  end if;

  -- Regla 15: marca de edad fuera del rango de algún programa (no bloquea)
  select string_agg(distinct p.name, ', ') into v_out_of_range
  from training_schedules s
  join programs p on p.id = s.program_id
  where s.id = any (v_schedule_ids)
    and (
      (p.min_age is not null and date_part('year', age(v_athlete_birth_date)) < p.min_age)
      or (p.max_age is not null and date_part('year', age(v_athlete_birth_date)) > p.max_age)
    );

  v_final_notes := nullif(trim(
    v_notes || case
      when v_out_of_range is not null then ' [edad fuera del rango de: ' || v_out_of_range || ']'
      else ''
    end
  ), '');

  insert into registrations (athlete_id, venue_id, required_schedules, status, source, notes)
  values (v_athlete_id, v_venue_id, v_required, 'pending', 'web_form', v_final_notes)
  returning id into v_registration_id;

  insert into registration_schedules (registration_id, schedule_id)
  select v_registration_id, unnest(v_schedule_ids);

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
end;
$$;

revoke all on function submit_preregistration(jsonb) from public;
grant execute on function submit_preregistration(jsonb) to anon, authenticated;
