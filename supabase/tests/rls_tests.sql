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

reset role;

-- =====================================================================
-- 4) Perfiles de staff para las pruebas: usamos el admin real (paso 11)
-- y un manager de prueba creado a mano (Auth > Add user + Table Editor),
-- porque admin_profiles.id es FK a auth.users y no se pueden insertar
-- perfiles con UUIDs inventados desde el Editor SQL.
-- =====================================================================
select set_config('t.admin_profiles_baseline',
  (select count(*) from admin_profiles)::text, true);

-- =====================================================================
-- 5) Como usuario autenticado SIN perfil de staff
-- =====================================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';

do $$
declare
  n int;
  s text;
  t text;
  b boolean;
begin
  -- Puede seguir viendo lo público, igual que un visitante
  select count(*) into n from venues where is_active;
  assert n > 0, 'FALLA: usuario sin perfil no pudo leer sedes activas';

  -- is_staff() / is_admin() sí se pueden ejecutar (a diferencia de anon), pero deben dar false
  select is_staff() into b;
  assert b = false, 'FALLA: is_staff() dio true para un usuario sin perfil';

  select is_admin() into b;
  assert b = false, 'FALLA: is_admin() dio true para un usuario sin perfil';

  -- No puede leer tablas privadas
  foreach t in array array['admin_profiles', 'athletes', 'guardians', 'athlete_guardians', 'registrations'] loop
    begin
      execute format('select count(*) from %I', t) into n;
      assert n = 0, format('FALLA: usuario sin perfil ve %s filas de %s', n, t);
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- No puede escribir nada
  foreach s in array array[
    $q$insert into venues (name, slug, address) values ('hack', 'hack', 'x')$q$,
    $q$insert into athletes (first_name, last_name, birth_date) values ('hack', 'hack', '2015-01-01')$q$,
    $q$insert into admin_profiles (id, full_name) values (gen_random_uuid(), 'hack')$q$
  ] loop
    begin
      execute s;
      raise exception 'FALLA: usuario sin perfil pudo ejecutar: %', s;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

reset role;

-- =====================================================================
-- 6) Como manager
-- =====================================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "36da1201-65fa-44c1-8eff-fd76a7a67f30", "role": "authenticated"}';

do $$
declare
  n int;
  b boolean;
  v_athlete_id uuid;
  v_guardian_id uuid;
begin
  select is_staff() into b;
  assert b = true, 'FALLA: is_staff() dio false para un manager activo';

  select is_admin() into b;
  assert b = false, 'FALLA: is_admin() dio true para un manager';

  -- Puede leer y crear en tablas de negocio
  insert into venues (name, slug, address) values ('TEST manager sede', 'test-manager-sede', 'x');

  insert into athletes (first_name, last_name, birth_date)
  values ('TEST', 'ManagerDeportista', '2016-01-01')
  returning id into v_athlete_id;

  insert into guardians (first_name, last_name, phone)
  values ('TEST', 'ManagerAcudiente', '3000000001')
  returning id into v_guardian_id;

  insert into athlete_guardians (athlete_id, guardian_id, is_primary)
  values (v_athlete_id, v_guardian_id, true);

  update venues set description = 'editado por manager' where slug = 'test-manager-sede';

  -- Puede eliminar la relación deportista-acudiente (excepción D9)
  delete from athlete_guardians where athlete_id = v_athlete_id and guardian_id = v_guardian_id;

  -- No puede borrar deportistas (no hay política DELETE ahí)
  begin
    delete from athletes where id = v_athlete_id;
    get diagnostics n = row_count;
    assert n = 0, 'FALLA: manager pudo borrar un deportista';
  exception when insufficient_privilege then null;
  end;

  -- No puede crear admin_profiles (puede fallar por RLS o, si RLS lo dejara
  -- pasar, por la FK hacia auth.users; cualquiera de las dos formas confirma
  -- que la fila no se creó)
  begin
    insert into admin_profiles (id, full_name, role) values (gen_random_uuid(), 'hack', 'manager');
    raise exception 'FALLA: manager pudo crear un admin_profile';
  exception when insufficient_privilege then null;
  when foreign_key_violation then null;
  end;

  -- No puede editar el role de otro perfil de staff
  begin
    update admin_profiles set role = 'admin' where id = '36da1201-65fa-44c1-8eff-fd76a7a67f30';
    get diagnostics n = row_count;
    assert n = 0, 'FALLA: manager pudo editar admin_profiles';
  exception when insufficient_privilege then null;
  end;

  -- Solo ve su propia fila en admin_profiles, no las de otros
  select count(*) into n from admin_profiles;
  assert n = 1, format('FALLA: manager ve %s filas de admin_profiles, esperaba 1 (la propia)', n);
end;
$$;

reset role;

-- Limpiar lo que creó el manager (como postgres; también se revertiría solo con el rollback final)
delete from athletes where last_name = 'ManagerDeportista';
delete from guardians where last_name = 'ManagerAcudiente';
delete from venues where slug = 'test-manager-sede';

-- =====================================================================
-- 7) Como admin
-- =====================================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "2ea69ac4-704d-472d-8327-f79ad2fd6555", "role": "authenticated"}';

do $$
declare
  n int;
  b boolean;
begin
  select is_staff() into b;
  assert b = true, 'FALLA: is_staff() dio false para un admin activo';

  select is_admin() into b;
  assert b = true, 'FALLA: is_admin() dio false para un admin activo';

  -- Ve TODOS los admin_profiles, no solo el propio
  select count(*) into n from admin_profiles;
  assert n = current_setting('t.admin_profiles_baseline')::int,
    format('FALLA: admin ve %s filas de admin_profiles, esperaba %s',
      n, current_setting('t.admin_profiles_baseline')::int);

  -- Puede editar admin_profiles existentes (no probamos "crear" uno nuevo
  -- aquí porque requeriría otra cuenta real de Auth)
  update admin_profiles set full_name = 'TEST Manager (editado por admin)'
    where id = '36da1201-65fa-44c1-8eff-fd76a7a67f30';

  -- Sigue pudiendo operar tablas de negocio, igual que el manager
  insert into programs (name, slug) values ('TEST admin programa', 'test-admin-programa');
  update programs set is_active = false where slug = 'test-admin-programa';
end;
$$;

reset role;

select 'OK: todas las pruebas (anónimo, sin perfil, manager, admin) pasaron' as resultado;

rollback;
