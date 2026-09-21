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
