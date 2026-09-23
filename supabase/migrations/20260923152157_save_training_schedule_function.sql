create or replace function save_training_schedule(payload jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_schedule_id uuid;
  v_lead_id uuid;
  v_assistant_ids uuid[];
  v_assistant_id uuid;
begin
  v_lead_id := nullif(payload->>'lead_instructor_id', '')::uuid;

  v_assistant_ids := coalesce(
    (
      select array_agg((elem)::uuid)
      from jsonb_array_elements_text(coalesce(payload->'assistant_instructor_ids', '[]'::jsonb)) as elem
    ),
    array[]::uuid[]
  );

  if payload->>'id' is not null then
    update training_schedules set
      venue_id = (payload->>'venue_id')::uuid,
      program_id = (payload->>'program_id')::uuid,
      day_of_week = (payload->>'day_of_week')::smallint,
      start_time = (payload->>'start_time')::time,
      end_time = (payload->>'end_time')::time,
      max_capacity = (payload->>'max_capacity')::integer,
      is_active = (payload->>'is_active')::boolean
    where id = (payload->>'id')::uuid
    returning id into v_schedule_id;

    if v_schedule_id is null then
      raise exception 'No se pudo actualizar el horario (no encontrado o sin permiso)';
    end if;
  else
    insert into training_schedules (
      venue_id, program_id, day_of_week, start_time, end_time, max_capacity, is_active
    ) values (
      (payload->>'venue_id')::uuid,
      (payload->>'program_id')::uuid,
      (payload->>'day_of_week')::smallint,
      (payload->>'start_time')::time,
      (payload->>'end_time')::time,
      (payload->>'max_capacity')::integer,
      (payload->>'is_active')::boolean
    )
    returning id into v_schedule_id;
  end if;

  delete from schedule_instructors where schedule_id = v_schedule_id;

  if v_lead_id is not null then
    insert into schedule_instructors (schedule_id, instructor_id, role)
    values (v_schedule_id, v_lead_id, 'lead');
  end if;

  foreach v_assistant_id in array v_assistant_ids loop
    if v_assistant_id is distinct from v_lead_id then
      insert into schedule_instructors (schedule_id, instructor_id, role)
      values (v_schedule_id, v_assistant_id, 'assistant')
      on conflict (schedule_id, instructor_id) do nothing;
    end if;
  end loop;

  return v_schedule_id;
end;
$$;

revoke all on function save_training_schedule(jsonb) from public;
grant execute on function save_training_schedule(jsonb) to authenticated;
