-- =====================================================================
-- Pruebas de la función submit_preregistration (inscripción con N horarios)
-- y de las validaciones de registrations / registration_schedules.
-- Ejecutar en Supabase Dashboard > SQL Editor > Run, dentro de una
-- transacción que termina en ROLLBACK: no deja datos en la base.
-- Resultado esperado: una fila que dice "OK: ...".
-- Re-ejecutar si se modifica la función o las tablas de inscripciones.
-- =====================================================================
begin;

-- 1) Datos propios de la prueba (como postgres), para no depender de los reales
--    Sede A: exige 2 horarios. Programa P1 con 3 horarios (lunes 10-11,
--    martes 10-11 y lunes 10:30-11:30, que se cruza con el primero).
--    Programa P2 en la sede A con 1 solo horario: NO es publicable (1 < 2).
--    Sede B: exige 2 horarios, con P1 en 2 horarios (publicable).
insert into venues (id, name, slug, address, schedules_per_athlete) values
  ('a0000000-0000-0000-0000-00000000000a', 'TEST Sede A', 'test-sede-a', 'x', 2),
  ('b0000000-0000-0000-0000-00000000000b', 'TEST Sede B', 'test-sede-b', 'x', 2);

insert into programs (id, name, slug, min_age, max_age) values
  ('c0000000-0000-0000-0000-000000000001', 'TEST P1', 'test-p1', 5, 12),
  ('c0000000-0000-0000-0000-000000000002', 'TEST P2', 'test-p2', null, null);

insert into venue_programs (venue_id, program_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001');

insert into training_schedules (id, venue_id, program_id, day_of_week, start_time, end_time, max_capacity) values
  -- Sede A, P1
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 1, '10:00', '11:00', 20),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 2, '10:00', '11:00', 1),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 1, '10:30', '11:30', 20),
  -- Sede A, P2 (no publicable)
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000002', 3, '10:00', '11:00', 20),
  -- Sede B, P1
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001', 4, '10:00', '11:00', 20),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001', 5, '10:00', '11:00', 20);

-- 2) Llamadas a la función, actuando como visitante anónimo
set local role anon;

do $$
declare
  v_result jsonb;
  v_base jsonb := jsonb_build_object(
    'athlete_first_name', 'Prueba', 'athlete_last_name', 'Uno',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Acudiente', 'guardian_last_name', 'Prueba',
    'guardian_phone', '3001112222', 'guardian_whatsapp', '', 'guardian_email', '',
    'notes', '', 'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  );
  -- Otro acudiente para cada caso de error, así no se activa el límite de frecuencia
  v_other jsonb := jsonb_build_object(
    'athlete_first_name', 'Otro', 'athlete_last_name', 'Caso',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Otro', 'guardian_last_name', 'Caso',
    'guardian_phone', '3009990000', 'guardian_whatsapp', '', 'guardian_email', '',
    'notes', '', 'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  );
begin
  -- Envío exitoso: 2 horarios de la sede A que no se cruzan, y no expone ids
  v_result := submit_preregistration(v_base || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002')));
  assert (v_result->>'ok')::boolean = true,
    format('FALLA: envío válido no fue exitoso: %s', v_result);
  assert not (v_result ? 'id'), 'FALLA: la respuesta expone un id';

  -- Mismo deportista otra vez en la sede A: ya tiene una inscripción abierta ahí
  v_result := submit_preregistration(v_base || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003')));
  assert (v_result->>'code') = 'duplicate_registration',
    format('FALLA: el reenvío debía dar duplicate_registration, dio: %s', v_result);

  -- Menos horarios de los que exige la sede
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001')));
  assert (v_result->>'code') = 'wrong_schedule_count',
    format('FALLA: 1 de 2 horarios debía dar wrong_schedule_count, dio: %s', v_result);

  -- Más horarios de los que exige la sede
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003')));
  assert (v_result->>'code') = 'wrong_schedule_count',
    format('FALLA: 3 de 2 horarios debía dar wrong_schedule_count, dio: %s', v_result);

  -- Horario repetido
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001')));
  assert (v_result->>'code') = 'validation_error',
    format('FALLA: horario repetido debía dar validation_error, dio: %s', v_result);

  -- Horarios que se cruzan (lunes 10-11 y lunes 10:30-11:30)
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003')));
  assert (v_result->>'code') = 'schedule_overlap',
    format('FALLA: horarios cruzados debían dar schedule_overlap, dio: %s', v_result);

  -- Horarios de dos sedes distintas
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005')));
  assert (v_result->>'code') = 'different_venues',
    format('FALLA: dos sedes debían dar different_venues, dio: %s', v_result);

  -- Programa no publicable (P2 tiene 1 horario y la sede exige 2)
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004')));
  assert (v_result->>'code') = 'schedule_not_found',
    format('FALLA: programa no publicable debía dar schedule_not_found, dio: %s', v_result);

  -- Horario que no existe
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array(
    'd0000000-0000-0000-0000-000000000001', gen_random_uuid())));
  assert (v_result->>'code') = 'schedule_not_found',
    format('FALLA: horario inexistente debía dar schedule_not_found, dio: %s', v_result);

  -- Sin horarios / formato inválido
  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', jsonb_build_array()));
  assert (v_result->>'code') = 'validation_error',
    format('FALLA: sin horarios debía dar validation_error, dio: %s', v_result);

  v_result := submit_preregistration(v_other || jsonb_build_object('schedule_ids', 'no-es-una-lista'));
  assert (v_result->>'code') = 'validation_error',
    format('FALLA: schedule_ids inválido debía dar validation_error, dio: %s', v_result);

  -- Honeypot lleno: responde ok pero no debe crear nada
  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Bot', 'athlete_last_name', 'Malicioso',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Bot', 'guardian_last_name', 'Malicioso',
    'guardian_phone', '3009998888', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_ids', jsonb_build_array('d0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006'),
    'notes', '', 'consent_accepted', true, 'consent_version', 'test-1',
    'website', 'http://spam.example.com'
  ));
  assert (v_result->>'ok')::boolean = true, 'FALLA: el honeypot no devolvió ok:true';

  -- Consentimiento no aceptado
  v_result := submit_preregistration(v_other || jsonb_build_object(
    'consent_accepted', false,
    'schedule_ids', jsonb_build_array('d0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006')));
  assert (v_result->>'code') = 'consent_required',
    format('FALLA: debía pedir consentimiento, dio: %s', v_result);

  -- El mismo deportista SÍ puede inscribirse en otra sede (B), y la edad
  -- fuera de rango (P1 es de 5 a 12 años) se marca en la nota sin bloquear
  v_result := submit_preregistration(v_base || jsonb_build_object(
    'athlete_birth_date', '2010-01-01', 'athlete_first_name', 'Mayor',
    'schedule_ids', jsonb_build_array('d0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006')));
  assert (v_result->>'ok')::boolean = true,
    format('FALLA: inscripción en la sede B no fue exitosa: %s', v_result);
end;
$$;

-- 3) Volver a un rol con privilegios para verificar qué quedó guardado de verdad
reset role;

do $$
declare
  v_count int;
  v_notes text;
begin
  select count(*) into v_count from athletes where first_name = 'Prueba' and last_name = 'Uno';
  assert v_count = 1, format('FALLA: se esperaba 1 deportista "Prueba Uno", hay %s', v_count);

  select count(*) into v_count from athletes where first_name = 'Bot';
  assert v_count = 0, 'FALLA: el honeypot sí creó un deportista';

  -- La inscripción exitosa en la sede A tiene sus 2 horarios y required_schedules = 2
  select count(*) into v_count
  from registrations r
  join athletes a on a.id = r.athlete_id
  join registration_schedules rs on rs.registration_id = r.id
  where a.first_name = 'Prueba' and r.venue_id = 'a0000000-0000-0000-0000-00000000000a'
    and r.required_schedules = 2 and r.status = 'pending' and r.source = 'web_form';
  assert v_count = 2, format('FALLA: la inscripción de la sede A tiene %s horarios, esperaba 2', v_count);

  select r.notes into v_notes
  from registrations r join athletes a on a.id = r.athlete_id
  where a.first_name = 'Mayor';
  assert v_notes like '%edad fuera del rango de: TEST P1%',
    format('FALLA: no se marcó la edad fuera de rango, notas: %s', v_notes);
end;
$$;

-- 4) Validaciones de la tabla (como postgres). Son diferidas: se fuerzan con
--    set constraints ... immediate dentro de un bloque que se revierte.
do $$
declare
  v_athlete_id uuid;
  v_registration_id uuid;
begin
  insert into athletes (first_name, last_name, birth_date)
  values ('TEST', 'Tabla', '2015-01-01')
  returning id into v_athlete_id;

  -- Cantidad distinta de required_schedules
  begin
    insert into registrations (athlete_id, venue_id, required_schedules)
    values (v_athlete_id, 'a0000000-0000-0000-0000-00000000000a', 2)
    returning id into v_registration_id;
    insert into registration_schedules (registration_id, schedule_id)
    values (v_registration_id, 'd0000000-0000-0000-0000-000000000001');
    set constraints registrations_schedules_check, registration_schedules_count_check immediate;
    raise exception 'FALLA: se guardó una inscripción con menos horarios de los requeridos';
  exception when raise_exception then
    if sqlerrm <> 'wrong_schedule_count' then raise; end if;
  end;
  set constraints registrations_schedules_check, registration_schedules_count_check deferred;

  -- Horarios cruzados
  begin
    insert into registrations (athlete_id, venue_id, required_schedules)
    values (v_athlete_id, 'a0000000-0000-0000-0000-00000000000a', 2)
    returning id into v_registration_id;
    insert into registration_schedules (registration_id, schedule_id) values
      (v_registration_id, 'd0000000-0000-0000-0000-000000000001'),
      (v_registration_id, 'd0000000-0000-0000-0000-000000000003');
    set constraints registrations_schedules_check, registration_schedules_count_check immediate;
    raise exception 'FALLA: se guardó una inscripción con horarios cruzados';
  exception when raise_exception then
    if sqlerrm <> 'schedule_overlap' then raise; end if;
  end;
  set constraints registrations_schedules_check, registration_schedules_count_check deferred;

  -- Horario de otra sede (inmediata)
  begin
    insert into registrations (athlete_id, venue_id, required_schedules)
    values (v_athlete_id, 'a0000000-0000-0000-0000-00000000000a', 1)
    returning id into v_registration_id;
    insert into registration_schedules (registration_id, schedule_id)
    values (v_registration_id, 'd0000000-0000-0000-0000-000000000005');
    raise exception 'FALLA: se guardó un horario de otra sede en la inscripción';
  exception when raise_exception then
    if sqlerrm <> 'different_venues' then raise; end if;
  end;

  -- Dos inscripciones abiertas del mismo deportista en la misma sede
  begin
    insert into registrations (athlete_id, venue_id, required_schedules) values
      (v_athlete_id, 'a0000000-0000-0000-0000-00000000000a', 1),
      (v_athlete_id, 'a0000000-0000-0000-0000-00000000000a', 1);
    raise exception 'FALLA: se crearon dos inscripciones abiertas en la misma sede';
  exception when unique_violation then null;
  end;
end;
$$;

-- 5) Llenar el cupo del horario d...02 (cupo 1) con una inscripción confirmada
insert into athletes (id, first_name, last_name, birth_date)
values ('e0000000-0000-0000-0000-000000000001', 'Relleno', 'Cupo', '2015-01-01');

insert into registrations (id, athlete_id, venue_id, required_schedules, status)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-00000000000a', 2, 'confirmed');

insert into registration_schedules (registration_id, schedule_id) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003');

-- 6) Como anónimo: un horario lleno rechaza toda la inscripción, y la
--    disponibilidad pública lo refleja
set local role anon;

do $$
declare
  v_result jsonb;
  v_spots int;
begin
  select available_spots into v_spots
  from get_schedule_availability()
  where schedule_id = 'd0000000-0000-0000-0000-000000000002';
  assert v_spots = 0, format('FALLA: el horario lleno muestra %s cupos', v_spots);

  v_result := submit_preregistration(jsonb_build_object(
    'athlete_first_name', 'Sin', 'athlete_last_name', 'Cupo',
    'athlete_birth_date', '2016-05-10',
    'guardian_first_name', 'Sin', 'guardian_last_name', 'Cupo',
    'guardian_phone', '3003334444', 'guardian_whatsapp', '', 'guardian_email', '',
    'schedule_ids', jsonb_build_array('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002'),
    'notes', '', 'consent_accepted', true, 'consent_version', 'test-1', 'website', ''
  ));
  assert (v_result->>'code') = 'schedule_full',
    format('FALLA: horario lleno debía dar schedule_full, dio: %s', v_result);
end;
$$;

reset role;

-- 7) Las inscripciones creadas cumplen las validaciones diferidas
set constraints all immediate;

select 'OK: todas las pruebas de submit_preregistration e inscripciones pasaron' as resultado;

rollback;
