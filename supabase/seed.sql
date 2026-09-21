insert into venues (name, slug, address, city, description)
values
  ('Sede Prado', 'prado', 'Coliseo Barrio El Prado', 'Zipaquirá', 'Sede de prueba. Reemplazar por datos reales.'),
  ('Sede Colsubsidio', 'colsubsidio', 'Dirección por confirmar', 'Zipaquirá', 'Sede de prueba. Reemplazar por datos reales.')
on conflict (slug) do update set
  address = excluded.address,
  city = excluded.city,
  description = excluded.description;



insert into programs (name, slug, description, level, min_age, max_age, sort_order)
values
  ('Niños 4–7 años y nuevos', 'ninos-4-7', 'Grupo para niños de 4 a 7 años y para quienes empiezan.', null, 4, 7, 1),
  ('Mayores de 7 años', 'mayores-7', 'Grupo para deportistas mayores de 7 años.', null, 8, null, 2)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  min_age = excluded.min_age,
  max_age = excluded.max_age,
  sort_order = excluded.sort_order;

insert into instructors (first_name, last_name, email, phone, specialty, bio)
select v.first_name, v.last_name, v.email, v.phone, v.specialty, v.bio
from (values
  ('Instructor', 'Prueba Uno', 'instructor1@example.com', '3000000001', 'Iniciación', 'Instructor de prueba. Reemplazar por datos reales.'),
  ('Instructor', 'Prueba Dos', 'instructor2@example.com', '3000000002', 'Técnica', 'Instructor de prueba. Reemplazar por datos reales.')
) as v(first_name, last_name, email, phone, specialty, bio)
where not exists (select 1 from instructors);


-- Horarios de desarrollo (12): 2 sedes x 2 grupos x 3 franjas
insert into training_schedules (venue_id, program_id, day_of_week, start_time, end_time, max_capacity)
select v.id, p.id, d.day_of_week, d.start_time::time, d.end_time::time, 20
from (values
  ('prado',       'ninos-4-7', 2, '15:00', '17:00'),
  ('prado',       'ninos-4-7', 5, '15:00', '17:00'),
  ('prado',       'ninos-4-7', 6, '10:00', '13:00'),
  ('prado',       'mayores-7', 3, '15:00', '17:00'),
  ('prado',       'mayores-7', 5, '17:00', '19:00'),
  ('prado',       'mayores-7', 6, '10:00', '13:00'),
  ('colsubsidio', 'ninos-4-7', 1, '15:00', '17:00'),
  ('colsubsidio', 'ninos-4-7', 3, '15:00', '17:00'),
  ('colsubsidio', 'ninos-4-7', 6, '13:00', '16:00'),
  ('colsubsidio', 'mayores-7', 1, '15:00', '17:00'),
  ('colsubsidio', 'mayores-7', 3, '15:00', '17:00'),
  ('colsubsidio', 'mayores-7', 6, '13:00', '16:00')
) as d(venue_slug, program_slug, day_of_week, start_time, end_time)
join venues v on v.slug = d.venue_slug
join programs p on p.slug = d.program_slug
where not exists (
  select 1 from training_schedules s
  where s.venue_id = v.id
    and s.program_id = p.id
    and s.day_of_week = d.day_of_week
    and s.start_time = d.start_time::time
);

-- Instructor principal solo en la sede Prado (Colsubsidio queda sin instructor a propósito)
insert into schedule_instructors (schedule_id, instructor_id, role)
select s.id, i.id, 'lead'
from training_schedules s
join venues v on v.id = s.venue_id and v.slug = 'prado'
join programs p on p.id = s.program_id
join instructors i
  on i.last_name = case p.slug when 'ninos-4-7' then 'Prueba Uno' else 'Prueba Dos' end
on conflict do nothing;
