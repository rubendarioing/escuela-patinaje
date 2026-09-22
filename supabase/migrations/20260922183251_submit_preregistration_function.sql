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

  v_schedule_id uuid;
  v_notes text;

  v_schedule record;
  v_available_spots integer;

  v_recent_count integer;

  v_guardian_id uuid;
  v_guardian_had_consent boolean;

  v_athlete_id uuid;
  v_athlete_is_new boolean := false;

  v_out_of_range boolean;
  v_final_notes text;
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
    v_schedule_id := (payload->>'schedule_id')::uuid;
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
     or v_schedule_id is null
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

  -- Regla 4: el horario debe existir y estar activo (con sede y programa activos)
  select s.id, s.max_capacity, s.program_id, p.min_age, p.max_age
    into v_schedule
  from training_schedules s
  join venues v on v.id = s.venue_id
  join programs p on p.id = s.program_id
  where s.id = v_schedule_id
    and s.is_active
    and v.is_active
    and p.is_active;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'schedule_not_found');
  end if;

  -- Regla 5: verificar cupo (misma lógica que get_schedule_availability)
  select greatest(
    v_schedule.max_capacity - coalesce(
      (select count(*) from registrations r
       where r.schedule_id = v_schedule.id and r.status in ('confirmed', 'active')),
      0
    ),
    0
  ) into v_available_spots;

  if v_available_spots <= 0 then
    return jsonb_build_object('ok', false, 'code', 'schedule_full');
  end if;

  -- Regla 11: límite de frecuencia por contacto (más de 3 en la última hora)
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

  -- Regla 6: acudiente. Reutilizar si existe, sin sobrescribir sus datos.
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

  -- Regla 7: deportista. Reutilizar si ya está asociado a este acudiente.
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

  -- Regla 8: relación deportista-acudiente
  if v_athlete_is_new then
    insert into athlete_guardians (athlete_id, guardian_id, is_primary)
    values (v_athlete_id, v_guardian_id, true);
  end if;

  -- Regla 9: inscripción pendiente; evitar duplicados abiertos
  if exists (
    select 1 from registrations
    where athlete_id = v_athlete_id
      and schedule_id = v_schedule_id
      and status in ('pending', 'confirmed', 'active')
  ) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_registration');
  end if;

  -- Regla 10: marca de edad fuera del rango del programa (no bloquea)
  v_out_of_range :=
    (v_schedule.min_age is not null and date_part('year', age(v_athlete_birth_date)) < v_schedule.min_age)
    or (v_schedule.max_age is not null and date_part('year', age(v_athlete_birth_date)) > v_schedule.max_age);

  v_final_notes := nullif(trim(
    v_notes || case when v_out_of_range then ' [edad fuera del rango del programa]' else '' end
  ), '');

  insert into registrations (athlete_id, schedule_id, status, source, notes)
  values (v_athlete_id, v_schedule_id, 'pending', 'web_form', v_final_notes);

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'code', 'validation_error');
end;
$$;

revoke all on function submit_preregistration(jsonb) from public;
grant execute on function submit_preregistration(jsonb) to anon, authenticated;
