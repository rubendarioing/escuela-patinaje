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
    coalesce(r.cnt, 0)::integer as enrolled_count,
    greatest(s.max_capacity - coalesce(r.cnt, 0), 0)::integer as available_spots
  from training_schedules s
  left join (
    select schedule_id, count(*) as cnt
    from registrations
    where status in ('confirmed', 'active')
    group by schedule_id
  ) r on r.schedule_id = s.id
  where s.is_active;
$$;

revoke all on function get_schedule_availability() from public;
grant execute on function get_schedule_availability() to anon, authenticated;
