insert into venues (name, slug, address, city, description)
values
  ('Sede Prado', 'prado', 'Coliseo Barrio El Prado', 'Zipaquirá', 'Sede de prueba. Reemplazar por datos reales.'),
  ('Sede Colsubsidio', 'colsubsidio', 'Dirección por confirmar', 'Zipaquirá', 'Sede de prueba. Reemplazar por datos reales.')
on conflict (slug) do update set
  address = excluded.address,
  city = excluded.city,
  description = excluded.description;
