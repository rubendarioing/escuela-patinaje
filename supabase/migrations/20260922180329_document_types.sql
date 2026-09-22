create table document_types (
  code text primary key,
  name text not null,
  sort_order smallint not null default 0
);

insert into document_types (code, name, sort_order) values
  ('RC', 'Registro Civil de Nacimiento', 1),
  ('TI', 'Tarjeta de Identidad', 2),
  ('CC', 'Cédula de Ciudadanía', 3),
  ('CE', 'Cédula de Extranjería', 4),
  ('PA', 'Pasaporte', 5),
  ('CD', 'Carné Diplomático', 6),
  ('SC', 'Salvoconducto de permanencia', 7),
  ('PPT', 'Permiso por Protección Temporal', 8),
  ('PEP', 'Permiso Especial de Permanencia', 9),
  ('DE', 'Documento extranjero', 10),
  ('CN', 'Certificado de Nacido Vivo', 11);

alter table document_types enable row level security;

create policy "document_types_read_all" on document_types
  for select to anon, authenticated
  using (true);
