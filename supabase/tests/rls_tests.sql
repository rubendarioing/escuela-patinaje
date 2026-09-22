-- =====================================================================
-- Pruebas RLS: parte anónima (pasos 19 y 30)
-- Cómo ejecutarlo: copiar todo en Supabase Dashboard > SQL Editor > Run.
-- Todo corre dentro de una transacción que termina en ROLLBACK, así que
-- no deja datos en la base.
-- Resultado esperado: una fila que dice "OK: ...".
-- Si algo falla, aparece un error que empieza con "FALLA:".
-- Re-ejecutar después de CADA migración que toque políticas o permisos.
-- =====================================================================
begin;

-- 1) Preparación (como postgres): datos inactivos para comprobar el filtrado
insert into venues (name, slug, address, is_active)
values ('TEST sede inactiva', 'test-sede-inactiva', 'x', false);

insert into programs (name, slug, is_active)
values ('TEST programa inactivo', 'test-programa-inactivo', false);

insert into instructors (first_name, last_name, email, phone, is_active)
values ('TEST', 'Inactivo', 'test@example.com', '3000000000', false);

-- Horario activo pero en una sede inactiva (el público NO debe verlo)
insert into training_schedules (venue_id, program_id, day_of_week, start_time, end_time, max_capacity)
select v.id, p.id, 1, '10:00', '11:00', 5
from venues v, programs p
where v.slug = 'test-sede-inactiva' and p.is_active
limit 1;

-- Instructor inactivo asociado a un horario visible (el público NO debe verlo)
insert into schedule_instructors (schedule_id, instructor_id, role)
select s.id, i.id, 'substitute'
from training_schedules s, instructors i
where i.last_name = 'Inactivo'
  and s.is_active
  and s.venue_id in (select id from venues where is_active)
limit 1;

-- Un deportista, un acudiente y una inscripción reales (como postgres),
-- para comprobar que el público no puede leerlos
insert into guardians (id, first_name, last_name, email)
values ('11111111-1111-1111-1111-111111111111', 'TEST', 'Acudiente', 'test.guardian@example.com');

insert into athletes (id, first_name, last_name, birth_date)
values ('22222222-2222-2222-2222-222222222222', 'TEST', 'Deportista', '2015-01-01');

insert into athlete_guardians (athlete_id, guardian_id, is_primary)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', true);

insert into registrations (athlete_id, schedule_id, status)
select '22222222-2222-2222-2222-222222222222', s.id, 'confirmed'
from training_schedules s
where s.is_active and s.venue_id in (select id from venues where is_active)
limit 1;

-- 2) Valores esperados, calculados como postgres (ve todo)
select set_config('t.venues',
  (select count(*) from venues where is_active)::text, true);
select set_config('t.programs',
  (select count(*) from programs where is_active)::text, true);
select set_config('t.instructors',
  (select count(*) from instructors where is_active)::text, true);
select set_config('t.schedules',
  (select count(*) from training_schedules s
   where s.is_active
     and exists (select 1 from venues v where v.id = s.venue_id and v.is_active)
     and exists (select 1 from programs p where p.id = s.program_id and p.is_active))::text, true);
select set_config('t.sched_instr',
  (select count(*) from schedule_instructors si
   join training_schedules s on s.id = si.schedule_id
   join instructors i on i.id = si.instructor_id
   where s.is_active and i.is_active
     and exists (select 1 from venues v where v.id = s.venue_id and v.is_active)
     and exists (select 1 from programs p where p.id = s.program_id and p.is_active))::text, true);
select set_config('t.doc_types',
  (select count(*) from document_types)::text, true);

-- 3) Desde aquí actuamos como visitante anónimo
set local role anon;

do $$
declare
  n int;
  s text;
  t text;
begin
  -- A) Lecturas públicas: solo lo activo
  select count(*) into n from venues;
  assert n = current_setting('t.venues')::int,
    format('FALLA: venues visibles=%s, esperadas=%s', n, current_setting('t.venues'));

  select count(*) into n from programs;
  assert n = current_setting('t.programs')::int,
    format('FALLA: programs visibles=%s, esperados=%s', n, current_setting('t.programs'));

  select count(id) into n from instructors;
  assert n = current_setting('t.instructors')::int,
    format('FALLA: instructors visibles=%s, esperados=%s', n, current_setting('t.instructors'));

  select count(*) into n from training_schedules;
  assert n = current_setting('t.schedules')::int,
    format('FALLA: horarios visibles=%s, esperados=%s', n, current_setting('t.schedules'));

  select count(*) into n from schedule_instructors;
  assert n = current_setting('t.sched_instr')::int,
    format('FALLA: schedule_instructors visibles=%s, esperados=%s', n, current_setting('t.sched_instr'));

  -- A2) document_types: catálogo público, debe verse completo
  select count(*) into n from document_types;
  assert n = current_setting('t.doc_types')::int,
    format('FALLA: document_types visibles=%s, esperados=%s', n, current_setting('t.doc_types'));

  -- B) Columnas privadas de instructors: deben estar bloqueadas
  begin
    perform email from instructors;
    raise exception 'FALLA: anon pudo leer instructors.email';
  exception when insufficient_privilege then null;
  end;

  begin
    perform phone from instructors;
    raise exception 'FALLA: anon pudo leer instructors.phone';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from instructors;
    raise exception 'FALLA: anon pudo hacer select * en instructors';
  exception when insufficient_privilege then null;
  end;

  -- C) Tablas privadas: el público no ve nada
  foreach t in array array['admin_profiles', 'athletes', 'guardians', 'athlete_guardians', 'registrations'] loop
    begin
      execute format('select count(*) from %I', t) into n;
      assert n = 0, format('FALLA: anon ve %s filas de %s', n, t);
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- D) Inserciones: todas deben fallar
  foreach s in array array[
    $q$insert into venues (name, slug, address) values ('hack', 'hack', 'x')$q$,
    $q$insert into programs (name, slug) values ('hack', 'hack')$q$,
    $q$insert into instructors (first_name, last_name) values ('hack', 'hack')$q$,
    $q$insert into training_schedules (venue_id, program_id, day_of_week, start_time, end_time, max_capacity) values (gen_random_uuid(), gen_random_uuid(), 1, '10:00', '11:00', 5)$q$,
    $q$insert into schedule_instructors (schedule_id, instructor_id) values (gen_random_uuid(), gen_random_uuid())$q$,
    $q$insert into admin_profiles (id, full_name) values (gen_random_uuid(), 'hack')$q$,
    $q$insert into document_types (code, name) values ('XX', 'hack')$q$,
    $q$insert into athletes (first_name, last_name, birth_date) values ('hack', 'hack', '2015-01-01')$q$,
    $q$insert into guardians (first_name, last_name, email) values ('hack', 'hack', 'hack@example.com')$q$,
    $q$insert into athlete_guardians (athlete_id, guardian_id) values (gen_random_uuid(), gen_random_uuid())$q$,
    $q$insert into registrations (athlete_id, schedule_id) values (gen_random_uuid(), gen_random_uuid())$q$
  ] loop
    begin
      execute s;
      raise exception 'FALLA: anon pudo ejecutar: %', s;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- E) Actualizaciones y borrados: deben fallar o no afectar ninguna fila
  foreach t in array array[
    'venues', 'programs', 'instructors', 'training_schedules',
    'schedule_instructors', 'admin_profiles',
    'athletes', 'guardians', 'athlete_guardians', 'registrations'
  ] loop
    begin
      execute format('update %I set created_at = created_at', t);
      get diagnostics n = row_count;
      assert n = 0, format('FALLA: anon pudo actualizar %s', t);
    exception when insufficient_privilege then null;
    end;

    begin
      execute format('delete from %I', t);
      get diagnostics n = row_count;
      assert n = 0, format('FALLA: anon pudo borrar en %s', t);
    exception when insufficient_privilege then null;
    end;
  end loop;

-- document_types no tiene created_at (catálogo sin columnas de auditoría);
  -- se prueba aparte con una columna que sí tiene.
  begin
    update document_types set name = name;
    get diagnostics n = row_count;
    assert n = 0, 'FALLA: anon pudo actualizar document_types';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from document_types;
    get diagnostics n = row_count;
    assert n = 0, 'FALLA: anon pudo borrar en document_types';
  exception when insufficient_privilege then null;
  end;

  -- F) Las funciones de autorización no son ejecutables por el público
  foreach s in array array['select is_staff()', 'select is_admin()'] loop
    begin
      execute s;
      raise exception 'FALLA: anon pudo ejecutar: %', s;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- G) get_schedule_availability() SÍ debe ser ejecutable por el público,
  -- y no debe exponer más columnas que el conteo
  begin
    perform * from get_schedule_availability() limit 1;
  exception when insufficient_privilege then
    raise exception 'FALLA: anon no pudo ejecutar get_schedule_availability()';
  end;
end;
$$;

select 'OK: todas las pruebas anónimas pasaron' as resultado;

rollback;
