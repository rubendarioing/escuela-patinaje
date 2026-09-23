-- Lectura pública de los 4 buckets
create policy "storage_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('venues', 'instructors', 'programs', 'gallery'));

-- Solo el staff puede subir
create policy "storage_staff_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('venues', 'instructors', 'programs', 'gallery')
    and (select is_staff())
  );

-- Solo el staff puede reemplazar (actualizar) un archivo
create policy "storage_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('venues', 'instructors', 'programs', 'gallery')
    and (select is_staff())
  )
  with check (
    bucket_id in ('venues', 'instructors', 'programs', 'gallery')
    and (select is_staff())
  );

-- Solo el staff puede borrar
create policy "storage_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('venues', 'instructors', 'programs', 'gallery')
    and (select is_staff())
  );
