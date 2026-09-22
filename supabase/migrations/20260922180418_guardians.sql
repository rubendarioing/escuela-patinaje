create table guardians (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  whatsapp text,
  source text not null default 'admin' check (source in ('admin', 'web_form')),
  data_consent_at timestamptz,
  data_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guardians_has_contact check (email is not null or phone is not null or whatsapp is not null),
  constraint guardians_email_format
    check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index guardians_email_idx on guardians (lower(email));
create index guardians_phone_idx on guardians (phone);
create index guardians_whatsapp_idx on guardians (whatsapp);

create trigger guardians_set_updated_at
  before update on guardians
  for each row execute function set_updated_at();

alter table guardians enable row level security;

create policy "guardians_staff_read" on guardians
  for select to authenticated using ((select is_staff()));

create policy "guardians_staff_insert" on guardians
  for insert to authenticated with check ((select is_staff()));

create policy "guardians_staff_update" on guardians
  for update to authenticated using ((select is_staff())) with check ((select is_staff()));
