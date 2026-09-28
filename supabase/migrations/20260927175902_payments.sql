create table payments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id),
  amount numeric(10,2) not null default 40000 check (amount > 0),
  payment_date date not null default current_date,
  -- Inicio del período que cubre este pago (ancla propia de cada
  -- deportista, no un mes calendario compartido). El siguiente pago
  -- de este mismo deportista normalmente empieza un mes después.
  period_start date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo pago por deportista por período (evita duplicar el mismo mes)
create unique index payments_athlete_period_unique_idx
  on payments (athlete_id, period_start);

create index payments_athlete_idx on payments (athlete_id);
create index payments_period_idx on payments (period_start);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

-- Mismo patrón que registrations: el staff (manager o admin) puede leer,
-- crear y editar pagos; nadie puede borrarlos (una corrección se hace
-- editando el monto, la fecha o las notas, no eliminando el registro).
create policy "payments_staff_read" on payments
  for select to authenticated using ((select is_staff()));

create policy "payments_staff_insert" on payments
  for insert to authenticated with check ((select is_staff()));

create policy "payments_staff_update" on payments
  for update to authenticated using ((select is_staff())) with check ((select is_staff()));
