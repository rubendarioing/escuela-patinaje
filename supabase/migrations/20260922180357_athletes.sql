create table athletes (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  document_type text references document_types(code),
  document_number text,
  birth_date date not null,
  gender text,
  notes text,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'inactive', 'withdrawn')),
  source text not null default 'admin' check (source in ('admin', 'web_form')),
  joined_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athletes_document_pair
    check ((document_type is null) = (document_number is null)),
  constraint athletes_birth_date_reasonable
    check (birth_date <= current_date and birth_date >= current_date - interval '100 years')
);

create unique index athletes_document_unique_idx
  on athletes (document_type, document_number)
  where document_number is not null;

create index athletes_name_idx on athletes (lower(last_name), lower(first_name));
create index athletes_status_idx on athletes (status);
create index athletes_document_type_idx on athletes (document_type);

create trigger athletes_set_updated_at
  before update on athletes
  for each row execute function set_updated_at();

alter table athletes enable row level security;

create policy "athletes_staff_read" on athletes
  for select to authenticated using ((select is_staff()));

create policy "athletes_staff_insert" on athletes
  for insert to authenticated with check ((select is_staff()));

create policy "athletes_staff_update" on athletes
  for update to authenticated using ((select is_staff())) with check ((select is_staff()));
