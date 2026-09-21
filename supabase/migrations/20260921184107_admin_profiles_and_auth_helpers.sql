-- Perfiles de administración (complementa Supabase Auth)
create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'manager' check (role in ('admin', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table admin_profiles enable row level security;

-- Funciones de autorización
create or replace function is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

-- Solo usuarios autenticados pueden ejecutarlas (el público anónimo no)
revoke execute on function is_staff() from public, anon;
revoke execute on function is_admin() from public, anon;
grant execute on function is_staff() to authenticated;
grant execute on function is_admin() to authenticated;

-- Políticas
create policy "admin_profiles_read_own_or_admin" on admin_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select is_admin()));

create policy "admin_profiles_admin_insert" on admin_profiles
  for insert to authenticated
  with check ((select is_admin()));

create policy "admin_profiles_admin_update" on admin_profiles
  for update to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));
