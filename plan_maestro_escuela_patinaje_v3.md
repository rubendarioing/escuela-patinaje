# Plan Maestro de Desarrollo — Escuela de Patinaje (v3)

> Documento de ejecución paso a paso para desarrollo asistido por IA (Claude u otra IA de programación).
>
> Stack objetivo: **React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Vercel + GitHub + dominio personalizado + PWA**.

---

# 0. Cómo usar este documento

1. Este documento es la **fuente de verdad**. Si una decisión no está aquí, se pregunta antes de implementarla.
2. La numeración de trabajo es **una sola**: los **54 pasos** de la sección 18, agrupados en 6 sprints (0 a 5).
3. Se trabaja **un paso a la vez**. Cada paso termina con la Definition of Done de la sección 20.
4. Las decisiones de arquitectura ya cerradas están en la sección 7. No se reabren sin justificación.
5. Las preguntas que dependen del dueño de la escuela están en la sección 22.4.

## 0.1 Qué cambió respecto a la v2

| # | Cambio | Motivo |
|---|---|---|
| 1 | La preinscripción pública se hace con una **función RPC** (`submit_preregistration`), no con inserts directos desde el navegador | En la v2 el formulario contradecía las políticas RLS (el público no puede leer ni escribir deportistas/acudientes) |
| 2 | Se define que la preinscripción usa `athletes.status = prospect` + `registrations.status = pending` (sin tabla nueva) | La v2 hablaba de "consultar preinscripciones" sin definir dónde viven |
| 3 | Se agregan `is_staff()` / `is_admin()` y se **desactiva el registro público** en Supabase Auth | Sin esto, cualquiera que se registrara sería "autenticado" y podría editar datos |
| 4 | `admin_profiles` pasa al **inicio** del orden de construcción | Las políticas RLS dependen de ella |
| 5 | Se agregan campos de **consentimiento** de tratamiento de datos en `guardians` | Hay datos de menores y la v2 no dejaba evidencia del consentimiento |
| 6 | Se agrega la función `get_schedule_availability()` | El sitio público muestra cupos pero no puede leer `registrations` |
| 7 | `instructors`: acceso público **solo a columnas seguras** (grants por columna) | RLS es por fila; sin esto el público podría leer email y teléfono de los instructores |
| 8 | **Migraciones versionadas** en `supabase/migrations` y **tipos generados** con `supabase gen types` | Reproducibilidad y coherencia con TypeScript |
| 9 | **Vercel se conecta en el paso 6**, no al final | La Definition of Done exige probar el preview en cada tarea |
| 10 | El **Service Worker se activa al final** (paso 49); manifest e iconos al inicio | El caché del SW estorba durante el desarrollo |
| 11 | Se define el manejo de **cupos**: cuentan `confirmed` y `active`; `pending` no reserva cupo | La v2 mostraba "cupo máximo" sin regla de disponibilidad |
| 12 | Se especifican **galería, FAQ, 404, detalle de deportista y aviso de cookies** | Estaban en el alcance sin especificación |
| 13 | Se unifican tres numeraciones (fases, 50 pasos, matriz) en **una sola** | Evitar confusión al reportar progreso |
| 14 | Se corrigen detalles del modelo: trigger `updated_at`, un solo instructor `lead` por horario, índice parcial en inscripciones, `source` en registros | Integridad de datos |
| 15 | Se añade **script de pruebas RLS** y prompts para RPC y pruebas de seguridad | La seguridad se valida, no se supone |
| 16 | Se documenta el riesgo de **SEO/Open Graph en una SPA** y la política de pausa del plan gratuito de Supabase | Riesgos reales para producción |

---

# 1. Objetivo del proyecto

Construir una aplicación web sencilla, moderna y escalable para una escuela de patinaje que permita:

- presentar la escuela públicamente;
- mostrar sedes, programas, horarios e instructores;
- captar preinscripciones;
- administrar deportistas, acudientes, instructores, sedes, programas, horarios e inscripciones;
- autenticar administradores;
- dejar preparada la base técnica para futuras funciones (pagos, asistencia, sesiones).

Prioridades, en este orden:

1. simplicidad;
2. rapidez de desarrollo;
3. bajo costo operativo;
4. buena experiencia móvil;
5. base de datos relacional limpia;
6. panel administrativo sencillo;
7. despliegue automático desde GitHub a Vercel.

## 1.1 Glosario

| Término | Significado en este proyecto |
|---|---|
| **Preinscripción** | Solicitud enviada desde la web pública. Crea un deportista `prospect` y una inscripción `pending` |
| **Inscripción** | Registro (`registrations`) de un deportista en un horario. Pasa por `pending → confirmed → active` |
| **Horario** | Registro de `training_schedules`: sede + programa + día + franja horaria |
| **Staff** | Usuario autenticado con perfil activo en `admin_profiles` (rol `admin` o `manager`) |
| **Acudiente** | Padre, madre o representante legal del deportista |

---

# 2. Alcance del MVP

## 2.1 Funcionalidades incluidas

### Sitio público

- Inicio, Nosotros, Programas, Sedes, Horarios, Instructores.
- Galería básica (ver 12.10).
- Preguntas frecuentes (ver 12.11).
- Contacto.
- Formulario de preinscripción.
- Botón flotante de WhatsApp.
- SEO básico, Google Analytics, Google Search Console.
- Política de privacidad y tratamiento de datos.
- Aviso de cookies/analítica (si aplica según la normativa del país).
- Página 404.
- Dominio personalizado y HTTPS.
- PWA instalable: manifest, Service Worker y página offline básica.

### Panel administrativo

- Login y protección de rutas.
- Dashboard.
- CRUD de sedes, programas, instructores, horarios, deportistas, acudientes e inscripciones.
- Consulta y gestión de preinscripciones (inscripciones `pending`).
- Activación/desactivación de registros (sin borrado físico).
- Filtros básicos.

## 2.2 Funcionalidades NO incluidas inicialmente

No desarrollar en el MVP:

- pagos en línea, facturación, nómina, reportes financieros, integración contable;
- control avanzado de asistencia, reservas por clase individual, reposición de clases, calendario recurrente avanzado;
- notificaciones automáticas por WhatsApp;
- app móvil nativa;
- login para padres o portal del deportista;
- certificados automáticos;
- gestión de competencias, inventario o tienda en línea;
- lista de espera automática;
- inscripción de deportistas adultos por cuenta propia (ver pregunta abierta 22.4).

---

# 3. Arquitectura general

```text
GitHub
   │
   ├── feature/*
   │      └── Vercel Preview
   │
   └── main
          └── Vercel Production
                    │
                    ▼
            React + Vite + TS
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Sitio público       Panel Admin
          │                   │
          └─────────┬─────────┘
                    ▼
                Supabase
      ┌─────────┬───┴───────┬───────────┐
      ▼         ▼           ▼           ▼
  PostgreSQL   Auth       Storage    Funciones RPC
  (RLS + vistas)                     (preinscripción,
                                      disponibilidad)
```

Principio: **el navegador nunca inserta directamente datos de menores desde el sitio público**. Solo llama a funciones controladas.

---

# 4. Stack técnico definitivo

## Frontend

React, Vite, TypeScript (modo estricto), React Router, Tailwind CSS, shadcn/ui, vite-plugin-pwa.

## Backend y datos

Supabase: PostgreSQL, Auth, Storage, Row Level Security, funciones SQL (RPC), Supabase CLI para migraciones.

## Infraestructura

GitHub, Vercel, dominio personalizado. Cloudflare es **opcional** (DNS, Turnstile si hace falta antispam reforzado).

## Herramientas auxiliares

ESLint, Prettier, React Hook Form, Zod, date-fns, Lucide Icons.

---

## 4.1 Estrategia PWA y mobile first

La aplicación es una web responsive **mobile first**. La PWA se mantiene simple en el MVP.

### Objetivos PWA del MVP

- instalable en dispositivos compatibles;
- manifest válido con iconos 192x192, 512x512 y maskable;
- modo standalone;
- Service Worker que cachea solo recursos estáticos esenciales;
- página offline simple;
- actualización controlada de nuevas versiones.

### Cronograma PWA (cambio v3)

- **Sprint 0:** manifest e iconos. El Service Worker **no** se registra todavía (`injectRegister: false`).
- **Sprint 5 (paso 49):** activar el Service Worker, página offline y pruebas PWA.

### Fuera de alcance PWA inicial

- sincronización offline con Supabase;
- edición offline de datos;
- colas de sincronización, IndexedDB para operaciones administrativas;
- push notifications, background sync;
- almacenamiento de datos privados en caché.

### Principio de seguridad

Nunca cachear de forma indiscriminada: datos de deportistas, datos de acudientes, información administrativa privada ni respuestas autenticadas sensibles. El Service Worker **no** debe interceptar las peticiones a `*.supabase.co`.

---

# 5. Convenciones de desarrollo

## 5.1 Idioma y nombres

- código en inglés;
- interfaz de usuario en español;
- tablas y columnas en inglés, `snake_case`;
- componentes React en `PascalCase`;
- funciones y variables en `camelCase`.

```ts
const getActiveSchedules = async () => {}
```

## 5.2 Mapeo snake_case ↔ camelCase

La base usa `snake_case` y el código `camelCase`. Regla:

- los **tipos de base de datos** se generan con `supabase gen types typescript` y viven en `src/types/database.types.ts`;
- cada `service` transforma filas a modelos de dominio (`Venue`, `Program`, …) con una función `mapXxx`;
- los componentes solo conocen los modelos de dominio.

## 5.3 Git

Rama principal: `main` (protegida, solo por Pull Request).

```text
feature/home-page
feature/venues
feature/schedules
feature/preregistration
feature/admin-dashboard
fix/mobile-menu
fix/schedule-filter
```

Commits:

```text
feat: add venues CRUD
fix: correct mobile navigation
refactor: simplify schedule form
docs: update setup instructions
db: add training_schedules migration
```

## 5.4 Migraciones de base de datos (cambio v3)

- Todo cambio de esquema se escribe como migración en `supabase/migrations/`.
- Nombre: `YYYYMMDDHHMMSS_descripcion.sql` (lo genera `supabase migration new`).
- **Prohibido** modificar tablas solo desde el panel web de Supabase sin guardar la migración.
- Cada migración de tabla incluye: tabla, índices, trigger `updated_at`, RLS, políticas y seed mínimo (el seed grande va en `supabase/seed.sql`).
- Después de cada migración: regenerar tipos.

---

# 6. Estructura recomendada del proyecto

```text
skating-school/
├── supabase/
│   ├── migrations/
│   ├── tests/            # scripts SQL de pruebas RLS
│   ├── seed.sql
│   └── config.toml
│
├── public/
│   └── icons/
│
├── src/
│   ├── app/
│   │   ├── router/
│   │   └── providers/
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/           # shadcn
│   ├── features/
│   │   ├── venues/
│   │   ├── programs/
│   │   ├── instructors/
│   │   ├── schedules/
│   │   ├── athletes/
│   │   ├── guardians/
│   │   └── registrations/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── validations/
│   │   └── utils/
│   ├── pages/
│   │   ├── public/
│   │   └── admin/
│   ├── services/
│   ├── types/
│   └── styles/
│
├── vercel.json
├── .env.example
└── README.md
```

---

# 7. Decisiones de arquitectura cerradas

Estas decisiones resuelven los huecos de la v2. Se pueden revisar, pero **no se cambian a mitad de un sprint**.

| ID | Decisión | Razón |
|---|---|---|
| **D1** | La preinscripción pública se envía a la función RPC `submit_preregistration` (`security definer`). El público **no** tiene permisos de escritura ni lectura sobre `athletes`, `guardians`, `athlete_guardians` ni `registrations` | Coherencia con RLS; una sola transacción; el cliente no ve datos de otras familias |
| **D2** | No existe tabla `pre_registrations`. Una preinscripción es `athletes.status='prospect'` + `registrations.status='pending'` con `source='web_form'` | Simplicidad. Alternativa si el spam contamina los datos: tabla separada |
| **D3** | El registro público de Supabase Auth está **desactivado**. Los administradores se crean manualmente | Evitar que cualquiera obtenga sesión autenticada |
| **D4** | Los permisos se calculan con `is_staff()` (admin o manager activos) e `is_admin()` (solo admin activo). Las políticas **nunca** usan solo `auth.role() = 'authenticated'` | Un usuario autenticado no es necesariamente administrador |
| **D5** | En el MVP `admin` y `manager` operan igual sobre datos de la escuela; solo `admin` gestiona `admin_profiles` | Simplicidad; se refinará si se necesita |
| **D6** | Disponibilidad de cupos: `max_capacity − (inscripciones con status confirmed o active)`. `pending` no reserva cupo. En el admin, sobrepasar el cupo genera advertencia, no bloqueo | Regla simple y explicable al dueño |
| **D7** | Si un horario no tiene cupo, la RPC rechaza la preinscripción con el código `schedule_full` y la interfaz sugiere otros horarios o WhatsApp | Sin lista de espera en el MVP |
| **D8** | El consentimiento de datos se guarda en `guardians` (`data_consent_at`, `data_consent_version`) | El acudiente es quien autoriza por el menor |
| **D9** | No hay borrado físico en tablas de negocio (no se crean políticas `DELETE`). Excepción: tablas de relación `schedule_instructors` y `athlete_guardians`, donde el staff puede eliminar la asociación | Trazabilidad |
| **D10** | Acceso público a `instructors` solo por columnas seguras mediante `GRANT SELECT (columnas)` | Ocultar email/teléfono |
| **D11** | Antispam del formulario en el MVP: campo honeypot + límite de envíos por contacto en la RPC. Si aparece spam real, agregar Cloudflare Turnstile verificado en una Edge Function | Evitar complejidad prematura |
| **D12** | SEO: aplicación SPA con metadatos por página vía `react-helmet-async`. Los previews de WhatsApp/redes **no ejecutan JavaScript**, por lo que verán solo los metadatos base. Si compartir enlaces por WhatsApp es prioritario, evaluar prerenderizado en el Sprint 5 | Limitación conocida de las SPA |
| **D13** | Vercel se conecta en el Sprint 0 con `vercel.json` (rewrites para React Router) | Preview desde la primera tarea |
| **D14** | Una edad fuera del rango del programa **no bloquea** la preinscripción: la interfaz advierte y la RPC agrega una marca en `notes` para revisión | No perder familias por rangos rígidos |
| **D15** | Migraciones versionadas y tipos generados (ver 5.2 y 5.4) | Reproducibilidad |

---

# 8. Diseño de base de datos

## 8.0 Modelo general

```text
venues ──────────┐
                 ├── training_schedules ──┬── schedule_instructors ── instructors
programs ────────┘          │             │
                            │             
                            └── registrations ── athletes ── athlete_guardians ── guardians

auth.users ── admin_profiles
```

Tablas (10):

```text
admin_profiles
venues
programs
instructors
training_schedules
schedule_instructors
athletes
guardians
athlete_guardians
registrations
```

Funciones públicas: `set_updated_at`, `is_staff`, `is_admin`, `get_schedule_availability`, `submit_preregistration`.

Los bloques SQL de este documento son **especificación de referencia**. La IA debe adaptarlos, entregarlos como migración y verificar que corran en Supabase sin errores.

---

## 8.1 Helpers globales (migración 0001)

```sql
-- Trigger genérico para updated_at
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

---

## 8.2 Tabla — admin_profiles (migración 0002)

Complementa Supabase Auth. **Va primero** porque las políticas de todas las demás tablas dependen de ella.

```sql
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
```

### Creación del primer administrador (manual)

1. En Supabase → Authentication → Users → crear usuario (email + contraseña).
2. Copiar su UUID.
3. Ejecutar en el SQL Editor:

```sql
insert into admin_profiles (id, full_name, role)
values ('UUID-DEL-USUARIO', 'Nombre Apellido', 'admin');
```

4. Verificar en Authentication → Providers/Settings que el **registro público (sign ups) está desactivado**.

### Criterio de aceptación

- [ ] un usuario sin fila en `admin_profiles` no puede leer ni escribir nada protegido;
- [ ] un usuario con `is_active = false` queda bloqueado;
- [ ] solo `admin` puede crear otros perfiles.

---

## 8.3 Patrón de políticas para tablas de negocio

Todas las tablas con RLS activo. Patrón para tablas con lectura pública (`venues`, `programs`, `training_schedules`):

```sql
alter table venues enable row level security;

-- Público: solo registros activos
create policy "venues_public_read" on venues
  for select to anon, authenticated
  using (is_active);

-- Staff: ve todo (incluidos inactivos)
create policy "venues_staff_read" on venues
  for select to authenticated
  using ((select is_staff()));

create policy "venues_staff_insert" on venues
  for insert to authenticated
  with check ((select is_staff()));

create policy "venues_staff_update" on venues
  for update to authenticated
  using ((select is_staff()))
  with check ((select is_staff()));

-- No se crea política DELETE: no hay borrado físico (decisión D9)
```

Patrón para tablas **solo staff** (`athletes`, `guardians`, `athlete_guardians`, `registrations`): igual, pero **sin** política `public_read`.

> Nota: Supabase otorga por defecto privilegios amplios a los roles `anon` y `authenticated` sobre tablas nuevas del esquema `public`. La seguridad real la da RLS; por eso **nunca** se deja una tabla sin `enable row level security`.

---

## 8.4 Tabla — venues (migración 0003)

Sedes de entrenamiento.

```sql
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text not null,
  city text,
  description text,
  phone text,
  whatsapp text,
  google_maps_url text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index venues_is_active_idx on venues (is_active);

create trigger venues_set_updated_at
  before update on venues
  for each row execute function set_updated_at();
```

Más: RLS y políticas según 8.3, y 2 registros de prueba.

### Criterio de aceptación

- [ ] crear, editar y desactivar sede (como staff);
- [ ] el público lista solo sedes activas;
- [ ] obtener sede por `slug`;
- [ ] el público no puede insertar ni actualizar.

---

## 8.5 Tabla — programs (migración 0004)

Ejemplos: Iniciación, Principiantes, Intermedio, Avanzado, Competencia.

```sql
create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  level text not null
    check (level in ('initiation', 'beginner', 'intermediate', 'advanced', 'competition')),
  min_age smallint check (min_age is null or min_age >= 0),
  max_age smallint check (max_age is null or max_age >= 0),
  sort_order smallint not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint programs_age_range check (min_age is null or max_age is null or min_age <= max_age)
);

create index programs_is_active_idx on programs (is_active, sort_order);
```

Más: trigger `updated_at`, RLS (8.3) y datos de prueba.

### Criterio de aceptación

- [ ] listar programas activos ordenados por `sort_order`;
- [ ] mostrar programa por `slug`;
- [ ] crear, editar, activar/desactivar;
- [ ] la restricción de edades impide `min_age > max_age`.

---

## 8.6 Tabla — instructors (migración 0005)

```sql
create table instructors (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  bio text,
  photo_url text,
  specialty text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructors_email_format
    check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index instructors_is_active_idx on instructors (is_active);
```

### Acceso público solo a columnas seguras (decisión D10)

RLS filtra **filas**, no columnas. Para que el público no lea `email` ni `phone`:

```sql
revoke all on instructors from anon;

grant select (id, first_name, last_name, specialty, bio, photo_url, is_active)
  on instructors to anon;

-- La política de lectura pública sigue filtrando por is_active
create policy "instructors_public_read" on instructors
  for select to anon
  using (is_active);
```

Consecuencias:

- las consultas públicas a `instructors` deben **listar columnas explícitas** (`select('id, first_name, ...')`), nunca `select('*')`;
- el staff (`authenticated`) mantiene acceso completo mediante las políticas del patrón 8.3.

### Criterio de aceptación

- [ ] el instructor se crea, edita y desactiva;
- [ ] aparece en la página pública solo si está activo;
- [ ] una consulta anónima que pida `email` o `phone` **falla**.

---

## 8.7 Tabla — training_schedules (migración 0006)

Núcleo funcional del sistema.

```sql
create table training_schedules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  program_id uuid not null references programs(id),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  max_capacity integer not null check (max_capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_schedules_time_range check (start_time < end_time)
);

create index training_schedules_venue_idx on training_schedules (venue_id);
create index training_schedules_program_idx on training_schedules (program_id);
create index training_schedules_day_idx on training_schedules (day_of_week);
```

Convención de día: `1 = lunes … 7 = domingo`.

### Política de lectura pública

Un horario es público solo si él, su sede y su programa están activos:

```sql
create policy "training_schedules_public_read" on training_schedules
  for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from venues v where v.id = venue_id and v.is_active)
    and exists (select 1 from programs p where p.id = program_id and p.is_active)
  );
```

(Las políticas del staff siguen el patrón 8.3.)

### Criterio de aceptación

Se puede consultar: horarios por sede, por programa, por día, activos y con cupo disponible (ver 8.13).

---

## 8.8 Tabla — schedule_instructors (migración 0007)

Relación N:M entre horarios e instructores.

```sql
create table schedule_instructors (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references training_schedules(id) on delete cascade,
  instructor_id uuid not null references instructors(id),
  role text not null default 'assistant' check (role in ('lead', 'assistant', 'substitute')),
  created_at timestamptz not null default now(),
  unique (schedule_id, instructor_id)
);

-- Un solo instructor principal por horario
create unique index schedule_instructors_one_lead_idx
  on schedule_instructors (schedule_id)
  where role = 'lead';

create index schedule_instructors_instructor_idx on schedule_instructors (instructor_id);
```

### Políticas

- Público: lectura solo cuando el horario y el instructor están activos.
- Staff: leer, insertar, actualizar **y eliminar** (excepción D9: es una asociación, no un registro de negocio).

### Criterio de aceptación

- [ ] un horario tiene 0 o 1 instructor principal y varios auxiliares;
- [ ] un instructor participa en múltiples horarios;
- [ ] no se puede repetir el mismo instructor en un horario.

---

## 8.9 Tabla — athletes (migración 0008)

```sql
create table athletes (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  document_type text
    check (document_type is null or document_type in ('RC', 'TI', 'CC', 'CE', 'PP', 'OTHER')),
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
    check ((document_type is null) = (document_number is null))
);

-- Documento único cuando existe
create unique index athletes_document_unique_idx
  on athletes (document_type, document_number)
  where document_number is not null;

create index athletes_name_idx on athletes (lower(last_name), lower(first_name));
create index athletes_status_idx on athletes (status);
```

> Los tipos de documento (`RC`, `TI`, `CC`, `CE`, `PP`) asumen Colombia. Ajustar si la escuela opera en otro país.

Estados: `prospect` (preinscrito), `active`, `inactive`, `withdrawn`.

RLS: **solo staff** (patrón 8.3 sin lectura pública).

### Criterio de aceptación

- [ ] crear, editar y cambiar estado;
- [ ] buscar por nombre y por documento;
- [ ] no se pueden duplicar documentos;
- [ ] el público no puede leer ni escribir.

---

## 8.10 Tabla — guardians (migración 0009)

```sql
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
```

RLS: solo staff.

### Criterio de aceptación

- [ ] crear, editar y buscar acudientes;
- [ ] relacionar con uno o más deportistas;
- [ ] los acudientes creados desde la web guardan `data_consent_at` y `data_consent_version`.

---

## 8.11 Tabla — athlete_guardians (migración 0010)

```sql
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

-- Un solo acudiente principal por deportista
create unique index athlete_guardians_one_primary_idx
  on athlete_guardians (athlete_id)
  where is_primary;
```

RLS: solo staff (puede eliminar la asociación, D9).

---

## 8.12 Tabla — registrations (migración 0011)

Inscripción de un deportista a un horario.

```sql
create table registrations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id),
  schedule_id uuid not null references training_schedules(id),
  registration_date date not null default current_date,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'active', 'cancelled', 'completed')),
  source text not null default 'admin' check (source in ('admin', 'web_form')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita duplicados "abiertos" del mismo deportista en el mismo horario
create unique index registrations_open_unique_idx
  on registrations (athlete_id, schedule_id)
  where status in ('pending', 'confirmed', 'active');

create index registrations_schedule_status_idx on registrations (schedule_id, status);
create index registrations_status_idx on registrations (status);
```

Estados: `pending` (preinscripción), `confirmed`, `active`, `cancelled`, `completed`.

RLS: solo staff.

### Criterio de aceptación

- [ ] registrar deportista en un horario;
- [ ] cambiar de horario (cancelar la anterior y crear la nueva);
- [ ] cancelar inscripción sin borrarla;
- [ ] consultar inscritos por horario;
- [ ] no se permite una segunda inscripción abierta del mismo deportista al mismo horario.

---

## 8.13 Funciones públicas (migraciones 0012a y 0012b)

### a) Disponibilidad de cupos (migración 0012a)

El público necesita ver cupos, pero no puede leer `registrations`. Se expone **solo el conteo**:

```sql
create or replace function get_schedule_availability()
returns table (
  schedule_id uuid,
  max_capacity integer,
  enrolled_count integer,
  available_spots integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.max_capacity,
    coalesce(r.cnt, 0)::integer as enrolled_count,
    greatest(s.max_capacity - coalesce(r.cnt, 0), 0)::integer as available_spots
  from training_schedules s
  left join (
    select schedule_id, count(*) as cnt
    from registrations
    where status in ('confirmed', 'active')
    group by schedule_id
  ) r on r.schedule_id = s.id
  where s.is_active;
$$;

revoke all on function get_schedule_availability() from public;
grant execute on function get_schedule_availability() to anon, authenticated;
```

### b) Preinscripción pública — `submit_preregistration` (migración 0012b)

Contrato (la IA implementa la función respetando estas reglas):

```sql
create or replace function submit_preregistration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- implementar según las reglas de abajo
$$;

revoke all on function submit_preregistration(jsonb) from public;
grant execute on function submit_preregistration(jsonb) to anon, authenticated;
```

**Entrada (`payload`):**

```json
{
  "athlete_first_name": "",
  "athlete_last_name": "",
  "athlete_birth_date": "YYYY-MM-DD",
  "guardian_first_name": "",
  "guardian_last_name": "",
  "guardian_phone": "",
  "guardian_whatsapp": "",
  "guardian_email": "",
  "schedule_id": "uuid",
  "notes": "",
  "consent_accepted": true,
  "consent_version": "2026-01",
  "website": ""
}
```

`website` es el campo honeypot: debe llegar vacío.

**Salida:** siempre `jsonb`, sin exponer ids ni datos existentes:

```json
{ "ok": true }
{ "ok": false, "code": "consent_required" }
```

Códigos: `validation_error`, `consent_required`, `schedule_not_found`, `schedule_full`, `duplicate_registration`, `rate_limited`.

**Reglas obligatorias:**

1. Si `website` no está vacío → responder `{ "ok": true }` sin guardar nada (el bot cree que funcionó).
2. `consent_accepted` debe ser `true`; si no, `consent_required`.
3. Validar en servidor: longitudes máximas de cada campo, formato de email, fecha de nacimiento razonable (no futura, no anterior a 100 años), al menos un medio de contacto.
4. El horario debe existir y estar activo (con sede y programa activos); si no, `schedule_not_found`.
5. Verificar cupo con la misma lógica de `get_schedule_availability`; si `available_spots = 0`, `schedule_full` (decisión D7).
6. **Acudiente:** buscar uno existente por `lower(email)` o `whatsapp` o `phone`. Si existe, **reutilizarlo sin sobrescribir sus datos** (un anónimo no debe modificar registros existentes). Si no existe, crearlo con `source='web_form'`, `data_consent_at = now()` y `data_consent_version`. Si existe pero no tiene consentimiento registrado, registrarlo.
7. **Deportista:** buscar uno ya asociado a ese acudiente con el mismo nombre, apellido y fecha de nacimiento. Si existe, reutilizarlo; si no, crearlo con `status='prospect'` y `source='web_form'`.
8. Crear la relación `athlete_guardians` (si no existe), marcándola `is_primary` si el deportista no tiene principal.
9. Crear la inscripción `pending` con `source='web_form'`. Si ya existe una abierta para ese deportista y horario → `duplicate_registration`.
10. Si la edad del deportista está fuera del rango del programa, **no rechazar**: agregar a `notes` la marca `[edad fuera del rango del programa]` (decisión D14).
11. **Límite de frecuencia:** si el mismo contacto (email/whatsapp/phone) generó más de 3 preinscripciones en la última hora → `rate_limited`.
12. Todo dentro de una sola transacción: o se guarda todo, o nada.

### Criterio de aceptación

- [ ] un usuario anónimo puede llamar la función y crear una preinscripción completa;
- [ ] el mismo usuario anónimo **no puede** hacer `select` sobre `athletes`, `guardians`, `athlete_guardians` ni `registrations`;
- [ ] reenviar el mismo formulario no duplica deportista ni inscripción;
- [ ] un horario lleno devuelve `schedule_full`;
- [ ] un envío con honeypot lleno no crea registros;
- [ ] la respuesta nunca contiene ids ni datos de otras familias.

---

# 9. Seguridad y Row Level Security

## 9.1 Matriz de permisos

| Tabla / función | Público (anon) | Staff (admin/manager) | Solo admin |
|---|---|---|---|
| `venues` | Leer activas | Leer todas, crear, editar | — |
| `programs` | Leer activas | Leer todas, crear, editar | — |
| `instructors` | Leer activos, **solo columnas públicas** | Todo excepto borrar | — |
| `training_schedules` | Leer activas (sede y programa activos) | Leer todas, crear, editar | — |
| `schedule_instructors` | Leer de horarios/instructores activos | Leer, crear, editar, **eliminar** | — |
| `athletes` | Nada | Leer, crear, editar | — |
| `guardians` | Nada | Leer, crear, editar | — |
| `athlete_guardians` | Nada | Leer, crear, editar, **eliminar** | — |
| `registrations` | Nada | Leer, crear, editar | — |
| `admin_profiles` | Nada | Leer el propio | Crear, editar, leer todos |
| RPC `get_schedule_availability` | Ejecutar | Ejecutar | — |
| RPC `submit_preregistration` | Ejecutar | Ejecutar | — |

## 9.2 Reglas generales

- Todas las tablas con RLS activo, sin excepciones.
- Sin `DELETE` físico en tablas de negocio (D9). Preferir `is_active = false` o cambio de estado.
- El registro público de Auth permanece desactivado (D3).
- Ninguna política usa solo `authenticated`: siempre `is_staff()` o `is_admin()` (D4).
- La `service_role key` **nunca** llega al navegador ni al repositorio.
- Toda validación del frontend se replica en la base (constraints) o en la RPC.

## 9.3 Pruebas RLS (obligatorias)

Crear `supabase/tests/rls_tests.sql` con casos que se ejecuten como cada rol. Casos mínimos:

**Como `anon`:**

- [ ] `select` de `venues`, `programs`, `training_schedules` devuelve solo activos;
- [ ] `select` de `instructors` con columnas públicas funciona;
- [ ] `select email from instructors` **falla**;
- [ ] `select` de `athletes`, `guardians`, `athlete_guardians`, `registrations`, `admin_profiles` devuelve 0 filas o error;
- [ ] `insert`/`update`/`delete` sobre cualquier tabla falla;
- [ ] `submit_preregistration` funciona y `get_schedule_availability` funciona.

**Como usuario autenticado sin perfil de staff:**

- [ ] no puede leer datos privados ni escribir nada.

**Como `manager`:**

- [ ] puede operar las tablas de negocio;
- [ ] no puede crear ni editar `admin_profiles`;
- [ ] no puede borrar registros de negocio.

**Como `admin`:**

- [ ] todo lo anterior más gestión de `admin_profiles`.

Re-ejecutar este script después de **cada** migración que toque políticas.

---

# 10. Storage

## 10.1 Buckets

```text
venues        (lectura pública)
instructors   (lectura pública)
programs      (lectura pública)
gallery       (lectura pública)
```

## 10.2 Reglas

- tamaño máximo por archivo: 2 MB (ajustable);
- tipos permitidos: `image/webp`, `image/jpeg`, `image/png`; preferir `webp`;
- nombres únicos: `{entidad-id}/{uuid}.webp`;
- **subida y borrado solo para staff** (políticas sobre `storage.objects` con `is_staff()`);
- lectura pública solo de estos buckets. **Nunca** guardar documentos de deportistas ni datos privados en Storage público.

### Criterio de aceptación

- [ ] staff sube una imagen y se guarda su URL en el registro;
- [ ] anónimo no puede subir ni borrar;
- [ ] un archivo con tipo no permitido es rechazado.

---

# 11. Rutas

## Públicas

```text
/
/nosotros
/programas
/programas/:slug
/sedes
/sedes/:slug
/horarios
/instructores
/galeria
/preguntas-frecuentes
/inscripcion
/contacto
/privacidad
*                      → página 404
```

## Administrativas

```text
/admin/login
/admin
/admin/sedes
/admin/programas
/admin/instructores
/admin/horarios
/admin/deportistas
/admin/deportistas/:id
/admin/acudientes
/admin/inscripciones
```

Todas las rutas `/admin/*` (excepto `/admin/login`) van dentro de `ProtectedRoute`.

## Configuración de Vercel

`vercel.json` con rewrite a `index.html` para que React Router funcione al recargar cualquier ruta:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

# 12. Sitio público

## 12.1 Layout público

Componentes: `PublicLayout`, `Header`, `DesktopNavigation`, `MobileNavigation`, `Footer`, `WhatsAppButton`, `PageContainer`, `SectionTitle`.

- **Header:** logo, menú, botón "Inscríbete", menú móvil.
- **Footer:** dirección, teléfono, WhatsApp, correo, redes, privacidad, copyright.

## 12.2 Estados obligatorios

Toda pantalla con datos remotos contempla `loading`, `success`, `empty` y `error`. Nunca pantalla en blanco.

## 12.3 Inicio (`/`)

Secciones: Hero (título, subtítulo, CTA "Ver horarios" e "Inscríbete", CTA WhatsApp, imagen), Beneficios (3-4), Programas destacados (3), Horarios destacados, Sedes, Instructores, Testimonios (componente simple con contenido estático), CTA final "Agenda tu clase de prueba".

> "Clase de prueba" en el MVP es solo un mensaje: el CTA lleva al formulario de preinscripción o a WhatsApp. No existe un flujo de agenda aparte.

Criterio de aceptación: responsive, carga rápida, CTA visible, sin errores, datos reales desde Supabase donde aplique.

## 12.4 Nosotros (`/nosotros`)

Historia, misión, visión, valores, metodología, seguridad, entrenadores, llamada a inscripción. Contenido estático.

## 12.5 Programas (`/programas`, `/programas/:slug`)

Lista de programas activos: nombre, nivel, edades, descripción, CTA. Detalle: descripción, edades, horarios disponibles, sedes disponibles, instructores relacionados, CTA de inscripción.

## 12.6 Sedes (`/sedes`, `/sedes/:slug`)

Tarjetas: nombre, dirección, imagen, botón mapa, programas, horarios. Detalle: descripción, mapa, horarios, programas, instructores frecuentes, CTA.

## 12.7 Horarios (`/horarios`) — página prioritaria

Filtros: **Sede, Programa, Día, Edad**.

Tarjeta de horario: programa, sede, día, hora inicio, hora fin, instructor principal, **cupos disponibles** (de `get_schedule_availability`), botón de inscripción (deshabilitado con mensaje si no hay cupo).

Requisitos UX: filtros sin recargar la página, mobile first, estados vacíos, skeleton de carga, botón "Limpiar filtros".

Criterio de aceptación: un usuario encuentra un horario en menos de 3 interacciones.

## 12.8 Instructores (`/instructores`)

Fotografía, nombre, especialidad, biografía corta. **No** mostrar ni consultar datos privados (D10).

## 12.9 Inscripción (`/inscripcion`)

Campos:

```text
Nombre deportista
Apellido deportista
Fecha de nacimiento
Nombre acudiente
Apellido acudiente
Teléfono
WhatsApp
Correo
Sede
Programa
Horario
Observaciones
Aceptación de tratamiento de datos (checkbox obligatorio, enlaza a /privacidad)
(campo oculto honeypot)
```

Flujo (cambio v3):

1. el usuario completa el formulario (puede llegar con `schedule_id` preseleccionado desde la página de horarios);
2. validación en cliente con Zod;
3. una **única llamada** a la RPC `submit_preregistration` (sección 8.13);
4. según el `code` devuelto se muestra el mensaje correspondiente (`schedule_full`, `duplicate_registration`, `rate_limited`, etc.);
5. si `ok`, pantalla de confirmación.

Confirmación: "Inscripción recibida. Nos pondremos en contacto contigo." + CTA "Hablar por WhatsApp".

Reglas:

- si la edad calculada está fuera del rango del programa, mostrar advertencia (no bloquear) — D14;
- el texto de consentimiento debe declarar que quien diligencia es el acudiente o representante legal del deportista;
- la versión de la política (`consent_version`) sale de una constante única (`POLICY_VERSION`).

## 12.10 Galería (`/galeria`)

Cuadrícula responsive de imágenes del bucket `gallery`, con `loading="lazy"`, `alt` obligatorio y visor simple. Sin panel de gestión propio en el MVP: las imágenes se administran desde Supabase Storage o una sección simple posterior.

## 12.11 Preguntas frecuentes (`/preguntas-frecuentes`)

Acordeón accesible (shadcn `Accordion`) con contenido estático en un archivo de datos (`src/features/faq/faq.data.ts`). Mínimo: edad de inicio, equipo necesario, clase de prueba, cómo inscribirse, qué pasa si el horario está lleno.

## 12.12 Contacto (`/contacto`)

WhatsApp, correo, teléfono, sedes, mapa, redes.

## 12.13 Privacidad (`/privacidad`)

Debe incluir: responsable del tratamiento, finalidad, datos recopilados, derechos del titular, medios de contacto, tratamiento de datos de menores, autorización y versión/fecha de vigencia.

**Debe validarse legalmente antes de producción.** La IA solo genera un borrador.

## 12.14 Página 404

Mensaje claro, enlace a Inicio y a Horarios.

---

# 13. Panel administrativo

## 13.1 Autenticación

Supabase Auth con email + contraseña. Registro público desactivado (D3).

`ProtectedRoute`:

- sin sesión → `/admin/login`;
- con sesión pero **sin perfil activo en `admin_profiles`** → cerrar sesión y mostrar "Acceso no autorizado";
- con perfil activo → acceso.

El logout debe limpiar la sesión y cualquier dato en memoria.

## 13.2 Layout

Componentes: `AdminLayout`, `AdminSidebar`, `AdminHeader`, `AdminContent`, `AdminBreadcrumbs`.

Menú: Dashboard, Sedes, Programas, Instructores, Horarios, Deportistas, Acudientes, Inscripciones, Salir.

## 13.3 Dashboard (`/admin`)

Métricas: deportistas activos, sedes, instructores, horarios activos, **preinscripciones pendientes** (inscripciones `pending`). Además: últimas inscripciones y próximos horarios. Sin gráficos complejos.

## 13.4 Sedes (`/admin/sedes`)

Listado: nombre, ciudad, estado, acciones (editar, activar/desactivar). Formulario: nombre, slug (autogenerado y editable), dirección, ciudad, descripción, teléfono, WhatsApp, URL de mapa, imagen, activo.

## 13.5 Programas (`/admin/programas`)

Listado: nombre, nivel, edad, estado, acciones. Formulario: nombre, slug, descripción, nivel, edad mínima, edad máxima, orden, imagen, activo.

## 13.6 Instructores (`/admin/instructores`)

Listado: nombre, especialidad, estado, acciones. Formulario: nombre, apellido, email, teléfono, especialidad, biografía, fotografía, activo.

## 13.7 Horarios (`/admin/horarios`) — sección más importante

Listado: sede, programa, día, hora, instructor, cupo (inscritos/máximo), estado, acciones.

Filtros: sede, programa, instructor, día, estado.

Formulario: sede, programa, día, hora inicio, hora fin, cupo, instructor principal, instructores auxiliares, estado.

Validaciones: sede y programa obligatorios, hora inicio < hora fin, cupo > 0, un solo instructor principal, al menos un instructor recomendado (advertencia). Al guardar, el horario y sus instructores se actualizan de forma coherente (si falla una parte, no queda a medias).

Advertencia opcional: aviso si el mismo instructor tiene otro horario que se cruza en el mismo día.

## 13.8 Deportistas (`/admin/deportistas`, `/admin/deportistas/:id`)

Tabla: nombre, edad, documento, estado, programa actual, sede, acciones. Búsqueda por nombre, apellido y documento. Filtro por estado (incluye `prospect`).

Detalle (`/admin/deportistas/:id`): datos básicos, acudientes (con relación y principal), inscripciones e historial, horarios, notas, origen (`admin`/`web_form`).

## 13.9 Acudientes (`/admin/acudientes`)

Nombre, teléfono, WhatsApp, email, deportistas asociados, estado del consentimiento (fecha y versión).

## 13.10 Inscripciones (`/admin/inscripciones`)

Columnas: deportista, programa, sede, horario, fecha, estado, origen, acciones.

Estados: Pendiente, Confirmada, Activa, Cancelada, Finalizada.

Filtros: estado, sede, programa, fecha. Vista rápida "Preinscripciones pendientes" (`status = pending` y `source = web_form`) con acciones de confirmar o cancelar.

Al confirmar o activar, mostrar advertencia si el horario ya está en su cupo máximo (D6).

---

# 14. Capas transversales

## 14.1 Componentes reutilizables

```text
DataTable, SearchInput, StatusBadge, EmptyState, LoadingState, ErrorState,
ConfirmDialog, FormField, SelectField, TimeField, DateField, ImageUpload,
PageHeader, SectionHeader, ErrorBoundary
```

Objetivo: no repetir lógica de UI.

## 14.2 Servicios Supabase

```text
services/
├── venues.service.ts
├── programs.service.ts
├── instructors.service.ts
├── schedules.service.ts
├── athletes.service.ts
├── guardians.service.ts
├── registrations.service.ts
└── preregistration.service.ts   # llama a la RPC
```

Ejemplo de funciones: `getVenues`, `getVenueBySlug`, `createVenue`, `updateVenue`, `deactivateVenue`.

Reglas:

- ningún componente llama a Supabase directamente;
- las consultas **públicas** a `instructors` listan columnas explícitas;
- cada service transforma `snake_case` a modelos de dominio (5.2).

## 14.3 Tipos

- Tipos de base: generados (`src/types/database.types.ts`).
- Modelos de dominio: `venue.ts`, `program.ts`, `instructor.ts`, `schedule.ts`, `athlete.ts`, `guardian.ts`, `registration.ts`.

## 14.4 Validaciones

Esquemas Zod: `venueSchema`, `programSchema`, `instructorSchema`, `scheduleSchema`, `athleteSchema`, `guardianSchema`, `registrationSchema`, `preregistrationSchema`.

Validar siempre en frontend **y** en base de datos / RPC. Nunca depender solo del frontend.

## 14.5 Manejo de errores

Toda consulta contempla `loading`, `success`, `empty`, `error`. `ErrorBoundary` global. Mensajes de error en español, sin exponer detalles técnicos al usuario.

---

# 15. Calidad

## 15.1 Diseño visual

Principios: limpio, deportivo, moderno, amigable, juvenil, profesional.

Evitar: exceso de animaciones, carruseles innecesarios, textos pequeños, fondos pesados, demasiados colores.

Mobile first: diseñar primero a **375px**; luego 768px, 1024px y 1440px.

## 15.2 Accesibilidad (WCAG AA razonable)

Validar contraste, navegación por teclado, labels, estados de foco, `alt` en imágenes, jerarquía de encabezados, `aria` donde sea necesario, mensajes de error asociados a sus campos.

## 15.3 SEO

Cada página pública: `title`, `meta description`, `canonical`, Open Graph (vía `react-helmet-async`). Además sitemap, `robots.txt` y URLs limpias (`/programas/iniciacion`, `/sedes/sede-norte`).

Limitación conocida (D12): los previews de WhatsApp y redes no ejecutan JavaScript. Decidir en el paso 47 si se acepta o se implementa prerenderizado.

El sitemap con slugs dinámicos puede generarse con un script en build o mantenerse manualmente en el MVP.

## 15.4 Performance

Imágenes WebP, lazy loading, code splitting por ruta, evitar paquetes grandes, skeletons, consultas Supabase optimizadas (columnas explícitas, sin N+1).

Objetivos Lighthouse iniciales: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90.

## 15.5 Seguridad (checklist)

- [ ] RLS activo en todas las tablas;
- [ ] pruebas RLS pasan (9.3);
- [ ] registro público de Auth desactivado;
- [ ] `anon key` solo en frontend; jamás `service_role` en cliente;
- [ ] secretos en Vercel, no en el repo;
- [ ] rutas admin protegidas y verificación de `admin_profiles`;
- [ ] inputs validados en cliente y servidor;
- [ ] uploads restringidos (tipo y tamaño);
- [ ] sesión y logout revisados;
- [ ] el Service Worker no cachea respuestas de Supabase.

---

# 16. Testing

## 16.1 Pruebas de base de datos

Script de pruebas RLS (9.3), ejecutado tras cada migración de políticas.

## 16.2 Testing manual — público

- [ ] Inicio y navegación;
- [ ] programas y detalle;
- [ ] sedes y detalle;
- [ ] horarios y filtros;
- [ ] instructores;
- [ ] galería y FAQ;
- [ ] formulario de inscripción (éxito, horario lleno, duplicado, honeypot, consentimiento no marcado);
- [ ] botón de WhatsApp;
- [ ] contacto y privacidad;
- [ ] 404.

## 16.3 Testing manual — admin

- [ ] login y logout;
- [ ] usuario sin perfil de staff no accede;
- [ ] crear/editar/desactivar sede, programa, instructor;
- [ ] crear horario y asociar instructores;
- [ ] crear deportista y acudiente y relacionarlos;
- [ ] crear inscripción, cambiar estado, cancelar;
- [ ] ver y gestionar preinscripciones web;
- [ ] filtros y búsquedas;
- [ ] advertencia de cupo.

## 16.4 Testing responsive

Mínimo: iPhone SE, iPhone estándar, Android estándar, tablet, laptop, desktop.

## 16.5 Testing PWA (en HTTPS: preview o producción)

**Instalación:**

- [ ] Android compatible;
- [ ] Chrome desktop compatible;
- [ ] iPhone/iOS según capacidades del navegador;
- [ ] icono, nombre y modo standalone correctos.

**Offline:**

- [ ] carga el shell básico;
- [ ] la página offline funciona y "Reintentar" funciona;
- [ ] recursos estáticos esenciales disponibles;
- [ ] los formularios indican que requieren Internet;
- [ ] el panel admin no muestra datos obsoletos como si fueran actuales;
- [ ] la actualización de versión funciona.

**Seguridad:**

- [ ] no se cachean respuestas de Supabase;
- [ ] no se persisten datos personales innecesariamente;
- [ ] tras logout no quedan vistas protegidas accesibles.

---

# 17. Despliegue

## 17.1 GitHub

Antes de producción:

- [ ] repo limpio y `.env.example` sin secretos;
- [ ] README actualizado (instalación, variables, migraciones, cómo crear el primer admin);
- [ ] `npm run build`, `npm run lint` y `npm run typecheck` funcionan;
- [ ] `main` protegida.

## 17.2 Vercel (desde el Sprint 0)

- `main` → producción; otras ramas → preview.
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `vercel.json` con rewrites (sección 11).
- Verificar los términos del plan de Vercel: el plan gratuito está pensado para uso personal no comercial; para una escuela puede corresponder un plan de pago.

## 17.3 Supabase en producción

- Decidir si se usa un proyecto separado para producción o un solo proyecto (recomendado: uno de desarrollo y otro de producción cuando haya datos reales).
- Los proyectos del plan gratuito pueden **pausarse por inactividad**; verificar la política vigente y considerar un plan de pago antes del lanzamiento.
- Entender y documentar cómo funcionan los backups del plan elegido.
- Aplicar las migraciones en el proyecto de producción con el CLI, no a mano.

## 17.4 Dominio personalizado

Configuración recomendada:

```text
Registrador → Vercel → Aplicación
```

Cloudflare es opcional (DNS, Turnstile). Agregar el dominio desde Vercel y configurar los registros DNS solicitados. Definir un **dominio canónico** (por ejemplo `https://www.escuelapatinaje.com`) y redirigir el otro (raíz ↔ `www`).

Validar:

- [ ] dominio raíz y `www`;
- [ ] HTTPS y certificado SSL;
- [ ] redirección HTTP → HTTPS;
- [ ] dominio canónico;
- [ ] variables de entorno correctas en producción;
- [ ] sitemap, canonical y Open Graph usan el dominio real;
- [ ] Search Console configurado sobre el dominio real.

## 17.5 Analítica

Google Analytics y Search Console.

Eventos sugeridos: `click_whatsapp`, `click_registration`, `submit_registration`, `view_schedule`, `filter_schedule`.

Reglas:

- no enviar datos personales (nombres, documentos, correos, teléfonos) a Analytics;
- si la normativa aplicable lo exige, mostrar aviso/consentimiento de cookies **antes** de cargar Analytics;
- mencionar el uso de Analytics en la política de privacidad.

## 17.6 Contenido real

Antes del lanzamiento sustituir: textos, imágenes, instructores, sedes, horarios, teléfonos y correos de demostración, y eliminar los datos `seed` del proyecto de producción.

---

# 18. Orden de construcción (54 pasos, 6 sprints)

No construir todo simultáneamente. Seguir este orden. Cada paso se cierra con la Definition of Done (sección 20) antes de pasar al siguiente.

## Sprint 0 — Base y despliegue

| # | Paso | Entregable / criterio |
|---|---|---|
| 01 | Repositorio GitHub | Repo con README, `.gitignore`, rama `main` protegida |
| 02 | Proyecto Vite React + TS | `npm run dev` abre sin errores; TypeScript estricto |
| 03 | Tailwind CSS | Estilos funcionando |
| 04 | shadcn/ui | Componente de prueba renderiza |
| 05 | ESLint + Prettier + scripts | `lint`, `typecheck`, `build` corren limpios |
| 06 | Conectar Vercel + `vercel.json` | Preview por rama y producción desde `main`; recargar una ruta interna no da 404 |
| 07 | Estructura de carpetas + React Router + estrategia mobile first | Rutas base y layout provisional a 375px |
| 08 | PWA parte 1: `vite-plugin-pwa` con manifest e iconos (192, 512, maskable). **Sin registrar Service Worker** (`injectRegister: false`) | Manifest válido cargado |

## Sprint 1 — Base de datos y lectura pública

| # | Paso | Entregable / criterio |
|---|---|---|
| 09 | Proyecto Supabase, `.env.local`, `.env.example`, Supabase CLI (`init` y `link`), **desactivar registro público de Auth** | CLI conectado; sin secretos en Git |
| 10 | Migración 0001–0002: `set_updated_at`, `admin_profiles`, `is_staff()`, `is_admin()` | Funciones creadas y con RLS |
| 11 | Crear primer administrador (manual, 8.2) | Existe un admin activo |
| 12 | `venues` + RLS + seed | Criterios de 8.4 |
| 13 | `programs` + RLS + seed | Criterios de 8.5 |
| 14 | `instructors` + RLS + grants por columna + seed | Criterios de 8.6 |
| 15 | `training_schedules` + RLS | Criterios de 8.7 |
| 16 | `schedule_instructors` + RLS | Criterios de 8.8 |
| 17 | Seed de desarrollo consolidado (2 sedes, 4 programas, 3 instructores, 8 horarios) | Ver ejemplo debajo de la tabla |
| 18 | Cliente `supabase.ts` + generación de tipos (`supabase gen types`) | Tipos importables sin errores |
| 19 | Script de pruebas RLS de las tablas públicas (9.3, parte anónima) | Todas las pruebas pasan |

Ejemplo de datos semilla de horarios:

```text
Sede Centro | Principiantes | Martes  | 16:00 - 18:00
Sede Centro | Intermedio    | Sábado  | 08:00 - 10:00
Sede Norte  | Iniciación    | Domingo | 09:00 - 11:00
```

## Sprint 2 — Sitio público informativo

| # | Paso | Entregable / criterio |
|---|---|---|
| 20 | Services de lectura (venues, programs, instructors, schedules). **La función `get_schedule_availability()` NO va aquí**: depende de `registrations` (paso 30) | Services probados |
| 21 | Componentes comunes: `LoadingState`, `ErrorState`, `EmptyState`, `PageContainer`, `SectionTitle`, `ErrorBoundary` | Reutilizables |
| 22 | `PublicLayout` final: Header, navegación móvil/desktop, Footer, WhatsAppButton | Navegación completa en móvil |
| 23 | Inicio | Criterios de 12.3 |
| 24 | Programas + detalle | Criterios de 12.5 |
| 25 | Sedes + detalle | Criterios de 12.6 |
| 26 | Horarios con filtros (cupos se muestran como "pendiente de conectar" hasta el paso 30; se conectan al terminarlo) | Criterios de 12.7 |
| 27 | Instructores | Sin datos privados (12.8) |
| 28 | Nosotros, Contacto, Preguntas frecuentes, Galería | Páginas de 12.4, 12.10–12.12 |
| 29 | Privacidad (borrador) + página 404 | Borrador pendiente de revisión legal |

## Sprint 3 — Captación de inscripciones

| # | Paso | Entregable / criterio |
|---|---|---|
| 30 | Migraciones `athletes`, `guardians`, `athlete_guardians`, `registrations` (solo staff) **+ migración 0012a `get_schedule_availability()`** (movida desde el paso 20) y conexión de cupos en la página de Horarios | Criterios de 8.9–8.12 y 8.13(a) |
| 31 | Migración 0012b: RPC `submit_preregistration` + pruebas SQL | Criterios de 8.13(b) |
| 32 | Formulario `/inscripcion` con Zod, honeypot y confirmación | Flujo de 12.9 |
| 33 | Prueba de extremo a extremo en el preview (éxito, lleno, duplicado, consentimiento) | Pruebas 16.2 y 9.3 (RPC) pasan |

## Sprint 4 — Panel administrativo

| # | Paso | Entregable / criterio |
|---|---|---|
| 34 | Login con Supabase Auth + `ProtectedRoute` con verificación de `admin_profiles` | Criterios de 13.1 |
| 35 | `AdminLayout` + Dashboard | Métricas de 13.3 |
| 36 | Componentes admin reutilizables: `DataTable`, `SearchInput`, `StatusBadge`, `ConfirmDialog`, `FormField`, `SelectField`, `TimeField`, `DateField`, `PageHeader` | Usados por los CRUD |
| 37 | Storage: buckets, políticas e `ImageUpload` | Criterios de la sección 10 |
| 38 | CRUD sedes | 13.4 |
| 39 | CRUD programas | 13.5 |
| 40 | CRUD instructores | 13.6 |
| 41 | CRUD horarios (con instructores asociados). Guardado atómico mediante función RPC/transacción (13.7) | 13.7 |
| 42 | CRUD deportistas + detalle | 13.8 |
| 43 | CRUD acudientes | 13.9 |
| 44 | CRUD inscripciones + vista de preinscripciones pendientes | 13.10 |

## Sprint 5 — Calidad y lanzamiento

| # | Paso | Entregable / criterio |
|---|---|---|
| 45 | Responsive final | Pruebas 16.4 |
| 46 | Accesibilidad | 15.2 |
| 47 | SEO (y decisión sobre prerenderizado, D12) | 15.3 |
| 48 | Performance | Lighthouse ≥ 90 |
| 49 | PWA parte 2: activar Service Worker, página offline, actualización controlada, QA PWA | Pruebas 16.5 |
| 50 | QA funcional completo + re-ejecución de pruebas RLS con los tres roles | Checklists 16.2, 16.3 y 9.3 |
| 51 | Contenido real + revisión legal de privacidad y consentimiento | Sin datos demo |
| 52 | Proyecto Supabase de producción (migraciones por CLI) + variables en Vercel | Producción con datos vacíos y seguros |
| 53 | Dominio personalizado + HTTPS | Checklist 17.4 |
| 54 | Analytics, Search Console y lanzamiento | Checklist 17.5 y sección 21 |

---

# 19. Método de trabajo con la IA

La IA ejecuta **una sola unidad funcional a la vez**.

No pedir:

```text
Construye toda la aplicación.
```

Pedir, por ejemplo:

```text
Implementa únicamente el paso 12 (tabla venues) según el plan maestro v3.
No avances al paso 13.
```

Secuencia típica para una entidad:

1. migración de la tabla (con RLS y pruebas);
2. servicio;
3. página pública o admin que usa el servicio.

Cada uno en una petición distinta.

Al cierre de cada paso la IA debe entregar: archivos creados, archivos modificados, checklist de lo terminado y pruebas manuales a realizar.

## 19.1 Prompt base (usar al iniciar cada paso)

```text
Estamos desarrollando una aplicación web para una escuela de patinaje.
Sigue el Plan Maestro v3 (adjunto). Trabaja únicamente el paso indicado.

Stack:
- React, Vite, TypeScript estricto, Tailwind, shadcn/ui
- Supabase (PostgreSQL, Auth, Storage, RLS, RPC), React Router
- React Hook Form, Zod, Vercel

Reglas:
1. No avances a funcionalidades fuera de esta tarea.
2. Mantén TypeScript estricto y no dupliques lógica.
3. Todo acceso a Supabase va en services; los componentes no consultan directamente.
4. Todo cambio de esquema es una migración en supabase/migrations; regenera los tipos.
5. Respeta RLS. Nunca uses solo "authenticated": usa is_staff() / is_admin().
6. Nunca expongas secretos ni uses la service_role key en el cliente.
7. Las consultas públicas a instructors listan columnas explícitas.
8. Mobile first (375px). Maneja loading, success, empty y error.
9. Respeta las decisiones D1–D15 del plan; si detectas que alguna debe cambiar, explícamelo antes.
10. No cachees datos privados en el Service Worker.
11. No refactorices archivos no relacionados.
12. Antes de terminar, valida imports, tipos, rutas, lint y build.
13. Entrega: archivos creados/modificados, checklist y pruebas manuales.

Paso actual:
[PEGAR AQUÍ EL PASO]
```

## 19.2 Prompt para cada tabla

```text
Implementa únicamente la tabla [TABLE_NAME] según la sección 8 del plan v3.

Entrega:
1. migración SQL completa (tabla, PK, FK, constraints, índices, trigger updated_at);
2. RLS y políticas usando is_staff()/is_admin() según el patrón 8.3;
3. seed mínimo;
4. actualización o adición de casos en supabase/tests/rls_tests.sql;
5. comandos para aplicarla y regenerar tipos;
6. explicación breve de cada decisión.

No avances a otras tablas.
```

## 19.3 Prompt para la RPC de preinscripción

```text
Implementa únicamente la función submit_preregistration según la sección 8.13(b)
y la decisión D1 del plan v3.

Debe:
- cumplir las 12 reglas obligatorias;
- ejecutarse como security definer con search_path fijo;
- devolver siempre jsonb con { ok, code } sin exponer ids ni datos existentes;
- no sobrescribir datos de acudientes existentes;
- correr en una sola transacción;
- otorgar EXECUTE solo a anon y authenticated.

Entrega también pruebas SQL: envío exitoso, reenvío duplicado, horario lleno,
honeypot, consentimiento ausente, límite de frecuencia, y verificación de que
anon no puede leer athletes, guardians, athlete_guardians ni registrations.
No implementes todavía la interfaz.
```

## 19.4 Prompt para cada página pública

```text
Implementa únicamente la página [PAGE_NAME] según la sección 12 del plan v3.

Debes:
1. respetar mobile first;
2. reutilizar componentes existentes;
3. obtener datos mediante services (columnas explícitas en instructors);
4. manejar loading, error y empty state;
5. usar TypeScript estricto y mantener accesibilidad;
6. agregar metadatos SEO;
7. no duplicar consultas.

No avances a otra página.
Al finalizar entrega: archivos creados, archivos modificados, checklist y pruebas manuales.
```

## 19.5 Prompt para cada CRUD administrativo

```text
Implementa únicamente el CRUD administrativo de [ENTITY] según la sección 13 del plan v3.

Debe incluir: listado, loading, error, empty state, búsqueda si aplica,
formulario crear/editar, validación Zod, confirmación antes de desactivar,
feedback de éxito/error, responsive, ruta protegida, e integración mediante service.

No hay borrado físico: se desactiva o se cambia de estado.
No uses consultas Supabase dentro de componentes.
No avances al siguiente CRUD.
```

## 19.6 Prompt para revisión de seguridad

```text
Revisa la seguridad del estado actual del proyecto contra la sección 9 y 15.5 del plan v3.

Verifica: RLS en todas las tablas, ausencia de políticas basadas solo en "authenticated",
grants de instructors, funciones security definer con search_path fijo, ausencia de
secretos en el repo, y que el Service Worker no cachea Supabase.

Ejecuta o actualiza supabase/tests/rls_tests.sql y reporta hallazgos por severidad.
No modifiques código sin listar antes los cambios propuestos.
```

---

# 20. Control de progreso y Definition of Done

## 20.1 Matriz de progreso (por sprint)

| Sprint | Pasos | Módulo | Estado | Revisado | Producción |
|---|---|---|---|---|---|
| 0 | 01–08 | Base, despliegue y manifest PWA | ⬜ | ⬜ | ⬜ |
| 1 | 09–19 | Base de datos y lectura pública | ⬜ | ⬜ | ⬜ |
| 2 | 20–29 | Sitio público informativo | ⬜ | ⬜ | ⬜ |
| 3 | 30–33 | Captación de inscripciones | ⬜ | ⬜ | ⬜ |
| 4 | 34–44 | Panel administrativo | ⬜ | ⬜ | ⬜ |
| 5 | 45–54 | Calidad y lanzamiento | ⬜ | ⬜ | ⬜ |

Estados: ⬜ pendiente · 🟡 en progreso · 🟢 terminado · 🔴 bloqueado.

## 20.2 Definition of Done

**Para todo paso:**

- [ ] código o migración implementados;
- [ ] compila, lint y TypeScript sin errores;
- [ ] commit con formato convencional en una rama `feature/*`;
- [ ] preview de Vercel probado;
- [ ] no hay secretos en el repo;
- [ ] documentación (README/este plan) actualizada si cambió algo.

**Si el paso toca base de datos:**

- [ ] migración versionada y tipos regenerados;
- [ ] RLS activo y pruebas RLS actualizadas y en verde.

**Si el paso toca interfaz:**

- [ ] funciona en móvil (375px) y desktop;
- [ ] estados loading, error y vacío;
- [ ] accesibilidad básica revisada;
- [ ] datos se guardan y se leen correctamente.

**Si el paso toca la PWA o el Service Worker:**

- [ ] PWA validada y sin caché de datos sensibles.

---

# 21. Checklist final de producción

## Base de datos

- [ ] tablas y relaciones correctas;
- [ ] RLS activo y políticas verificadas con los tres roles;
- [ ] registro público de Auth desactivado en producción;
- [ ] primer administrador creado;
- [ ] backups entendidos y documentados;
- [ ] datos seed eliminados.

## Sitio público

- [ ] responsive, SEO, navegación, formularios, WhatsApp;
- [ ] política de privacidad revisada legalmente y versionada (`POLICY_VERSION`);
- [ ] aviso de cookies si aplica;
- [ ] contenido real, sin datos demo.

## Panel admin

- [ ] login y protección de rutas;
- [ ] CRUD completo, filtros, estados y errores;
- [ ] gestión de preinscripciones.

## Infraestructura

- [ ] GitHub, Vercel, Supabase de producción;
- [ ] dominio, SSL, DNS y redirecciones;
- [ ] variables de entorno en producción;
- [ ] plan de Supabase y de Vercel adecuados para uso comercial y sin pausa por inactividad.

## PWA

- [ ] instalable, offline básico, sin caché de datos privados.

---

# 22. Cierre

## 22.1 Backlog futuro

**Fase 2:** sesiones, asistencia, pagos, historial deportivo, notificaciones.

**Fase 3:** portal de padres, certificados, competencias, reportes, panel de instructor, lista de espera.

**Fase 4:** capacidades offline avanzadas, automatizaciones, WhatsApp API, pagos recurrentes, facturación.

## 22.2 Modelo futuro para sesiones (no desarrollar todavía)

```text
training_schedules
        │
        ▼
class_sessions
        │
        ▼
attendance
```

`class_sessions`: `id`, `schedule_id`, `session_date`, `start_time`, `end_time`, `status`, `instructor_id`, `notes`.

`attendance`: `id`, `session_id`, `athlete_id`, `status`, `notes`.

## 22.3 Regla principal y resultado esperado

> No construir por anticipado funcionalidades que todavía no son necesarias.

El MVP resuelve:

```text
INFORMAR
+
MOSTRAR HORARIOS
+
CAPTAR INSCRIPCIONES
+
ADMINISTRAR DATOS BÁSICOS
```

Un **visitante** podrá: conocer la escuela, ver programas y sedes, buscar horarios con cupos, conocer instructores, enviar una preinscripción y contactar por WhatsApp.

Un **administrador** podrá: iniciar sesión, gestionar sedes, programas, instructores y horarios, administrar deportistas, acudientes e inscripciones, gestionar preinscripciones, desactivar registros y consultar el estado general de la escuela.

## 22.4 Preguntas abiertas para el dueño de la escuela

Responder antes del paso indicado:

| # | Pregunta | Antes del paso |
|---|---|---|
| 1 | ¿Se aceptan deportistas adultos que se inscriban por sí mismos? (el formulario actual asume acudiente) | 30 |
| 2 | ¿Qué hacer cuando un horario está lleno: solo rechazar (D7) o ofrecer lista de espera? | 31 |
| 3 | ¿Quién es el responsable legal del tratamiento de datos y cuál es su información de contacto? | 29 |
| 4 | ¿La escuela opera en Colombia? (define tipos de documento y normativa de datos personales aplicable) | 17 (antes de la migración de `athletes`, paso 30) |
| 5 | ¿Qué cantidad de sedes, programas y horarios reales habrá al lanzamiento? | 17 |
| 6 | ¿Cuál es el número oficial de WhatsApp y los canales sociales? | 22 |
| 7 | ¿Habrá uno o dos administradores? ¿Se necesita el rol `manager` desde el inicio? | 11 |
| 8 | ¿Qué dominio se comprará y quién lo administra? | 53 |
| 9 | ¿Se acepta pagar planes de Supabase/Vercel si el uso comercial lo exige? | 52 |

## 22.5 Criterio de éxito

El proyecto es exitoso cuando:

- el sitio es rápido y sencillo de mantener;
- funciona correctamente en móvil;
- el administrador modifica datos sin tocar código;
- los horarios se gestionan sin duplicación y los cupos reflejan la realidad;
- las inscripciones llegan y pueden gestionarse;
- la base mantiene integridad y ningún dato privado es accesible públicamente (verificado por pruebas RLS);
- el despliegue es automático desde GitHub;
- el dominio personalizado funciona con HTTPS;
- la web es instalable como PWA donde el navegador lo permita;
- el costo mensual de infraestructura es mínimo durante la etapa inicial.
