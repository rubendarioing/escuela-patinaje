create table athlete_guardians (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  relationship text not null default 'guardian'
    check (relationship in ('mother', 'father', 'grandmother', 'grandfather', 'guardian', 'other')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (athlete_id, guardian_id)
);

create unique index athlete_guardians_one_primary_idx
  on athlete_guardians (athlete_id)
  where is_primary;

create index athlete_guardians_guardian_idx on athlete_guardians (guardian_id);

alter table athlete_guardians enable row level security;

create policy "athlete_guardians_staff_read" on athlete_guardians
  for select to authenticated using ((select is_staff()));

create policy "athlete_guardians_staff_insert" on athlete_guardians
  for insert to authenticated with check ((select is_staff()));

create policy "athlete_guardians_staff_update" on athlete_guardians
  for update to authenticated using ((select is_staff())) with check ((select is_staff()));

create policy "athlete_guardians_staff_delete" on athlete_guardians
  for delete to authenticated using ((select is_staff()));
