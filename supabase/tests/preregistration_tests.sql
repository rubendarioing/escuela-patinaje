-- =====================================================================
-- Pruebas de la función submit_preregistration (paso 31)
-- Ejecutar en Supabase Dashboard > SQL Editor > Run, dentro de una
-- transacción que termina en ROLLBACK: no deja datos en la base.
-- Re-ejecutar si se modifica la función.
-- =====================================================================
begin;

-- 1) Llamadas a la función, actuando como visitante anónimo
set local role anon;

do $$
declare
  v_schedule_id uuid;
  v_full_schedule_id uuid;
  v_result jsonb;
begin
  select id into v_schedule_id from training_schedules where is_active limit 1;
  select id into v_full_schedule_id
  from training_schedules where is_active and id <> v_schedule_id limit 1;

  perform set_config('t.schedule_id', v_schedule_id::text, true);
  perform set_config('t.full_schedule_id', v_full_schedule_id::text, true);

  -- Envío exitoso, y la respuesta no expone ids
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Prueba', 'athlete_last_name', 'Uno',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Acudiente', 'guardian_last_name', 'Prueba',
    'guardian_phone', '3001112222', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', v_schedule_id, 'notes', '',
    'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'ok')::boolean = true,
    format('FALLA: envío válido no fue exitoso: %s', v_result);
  assert not (v_result ? 'id'), 'FALLA: la respuesta expone un id';

  -- Reenviar el mismo formulario: debe rechazarse como duplicado
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Prueba', 'athlete_last_name', 'Uno',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Acudiente', 'guardian_last_name', 'Prueba',
    'guardian_phone', '3001112222', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', v_schedule_id, 'notes', '',
    'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'code') = 'duplicate_registration',
    format('FALLA: el reenvío debía dar duplicate_registration, dio: %s', v_result);

  -- Honeypot lleno: responde ok pero no debe crear nada
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Bot', 'athlete_last_name', 'Malicioso',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Bot', 'guardian_last_name', 'Malicioso',
    'guardian_phone', '3009998888', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', v_schedule_id, 'notes', '',
    'consent_accepted', true, 'consent_version', 'test-1', 'website', 'http://spam.example.com'
  ));
  assert (v_result->>'ok')::boolean = true, 'FALLA: el honeypot no devolvió ok:true';

  -- Consentimiento no aceptado
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Sin', 'athlete_last_name', 'Consentir',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Sin', 'guardian_last_name', 'Consentir',
    'guardian_phone', '3005556666', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', v_schedule_id, 'notes', '',
    'consent_accepted', false, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'code') = 'consent_required',
    format('FALLA: debía pedir consentimiento, dio: %s', v_result);

  -- Horario que no existe
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Sin', 'athlete_last_name', 'Horario',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Sin', 'guardian_last_name', 'Horario',
    'guardian_phone', '3004445555', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', gen_random_uuid(), 'notes', '',
    'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'code') = 'schedule_not_found',
    format('FALLA: horario inexistente debía dar schedule_not_found, dio: %s', v_result);
end;
$$;

-- 2) Volver a un rol con privilegios para verificar qué quedó guardado de verdad
reset role;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from athletes where first_name = 'Prueba' and last_name = 'Uno';
  assert v_count = 1, format('FALLA: se esperaba 1 deportista "Prueba Uno", hay %s', v_count);

  select count(*) into v_count from athletes where first_name = 'Bot';
  assert v_count = 0, 'FALLA: el honeypot sí creó un deportista';
end;
$$;

-- 3) Preparar un horario lleno (como rol con privilegios)
insert into athletes (first_name, last_name, birth_date)
select 'Relleno', 'Cupo ' || n, '2015-01-01' from generate_series(1, 20) as n;

insert into registrations (athlete_id, schedule_id, status)
select a.id, current_setting('t.full_schedule_id')::uuid, 'confirmed'
from athletes a where a.last_name like 'Cupo %';

-- 4) Volver a actuar como anónimo para probar el horario lleno
set local role anon;

do $$
declare
  v_result jsonb;
begin
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Sin', 'athlete_last_name', 'Cupo',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Sin', 'guardian_last_name', 'Cupo',
    'guardian_phone', '3003334444', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_id', current_setting('t.full_schedule_id')::uuid, 'notes', '',
    'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'code') = 'schedule_full',
    format('FALLA: horario lleno debía dar schedule_full, dio: %s', v_result);
end;
$$;

reset role;

select 'OK: todas las pruebas de submit_preregistration pasaron' as resultado;

rollback;
