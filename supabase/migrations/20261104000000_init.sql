-- Motorcycle System — initial schema
-- Run in Supabase: SQL Editor → paste → Run   (or `supabase db push` with the Supabase CLI)

-- ─────────────────────────────── profiles ───────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  currency text not null default 'MYR',
  reminder_email boolean not null default true,
  reminder_push boolean not null default true,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── motorcycles ──────────────────────────────
create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nickname text not null,
  make text,
  model text,
  year int check (year between 1900 and 2100),
  engine_cc int check (engine_cc > 0),
  plate_number text,
  vin text,
  current_odometer int not null default 0 check (current_odometer >= 0),
  purchase_date date,
  photo_url text,
  created_at timestamptz not null default now()
);
create index motorcycles_user_id_idx on public.motorcycles (user_id);

-- ────────────────────────── maintenance types ───────────────────────────
-- user_id null = built-in default type visible to everyone.
create table public.maintenance_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  default_interval_km int check (default_interval_km > 0),
  default_interval_days int check (default_interval_days > 0),
  icon text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create index maintenance_types_user_id_idx on public.maintenance_types (user_id);

-- ──────────────────────── maintenance schedules ─────────────────────────
create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_type_id uuid not null references public.maintenance_types (id) on delete cascade,
  interval_km int check (interval_km > 0),
  interval_days int check (interval_days > 0),
  active boolean not null default true,
  unique (motorcycle_id, maintenance_type_id)
);

-- ─────────────────────────── maintenance logs ───────────────────────────
create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_type_id uuid not null references public.maintenance_types (id) on delete restrict,
  performed_at date not null default current_date,
  odometer int not null check (odometer >= 0),
  cost numeric(10, 2) check (cost >= 0),
  workshop_name text,
  google_place_id text,
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index maintenance_logs_bike_type_idx
  on public.maintenance_logs (motorcycle_id, maintenance_type_id, performed_at desc);

-- ────────────────────────── odometer readings ───────────────────────────
create table public.odometer_readings (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  odometer int not null check (odometer >= 0),
  recorded_at timestamptz not null default now()
);
create index odometer_readings_bike_idx on public.odometer_readings (motorcycle_id, recorded_at desc);

-- ────────────────────────── favorite workshops ──────────────────────────
create table public.favorite_workshops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  google_place_id text not null, -- only the place_id is stored (Google Maps Platform terms)
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, google_place_id)
);

-- ─────────────────────────────── devices ────────────────────────────────
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  push_token text not null unique,
  updated_at timestamptz not null default now()
);

-- ═════════════════════════ Row-Level Security ══════════════════════════
-- The app talks to Supabase directly with the public anon key, so RLS is what keeps
-- every user's data private. Every table has RLS enabled.

alter table public.profiles enable row level security;
alter table public.motorcycles enable row level security;
alter table public.maintenance_types enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.odometer_readings enable row level security;
alter table public.favorite_workshops enable row level security;
alter table public.devices enable row level security;

-- Helper: does the current user own this motorcycle?
create function public.owns_motorcycle(bike_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.motorcycles m
    where m.id = bike_id and m.user_id = (select auth.uid())
  );
$$;

create policy "own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own motorcycles" on public.motorcycles
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "read default and own types" on public.maintenance_types
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "insert own types" on public.maintenance_types
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own types" on public.maintenance_types
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own types" on public.maintenance_types
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "schedules of own bikes" on public.maintenance_schedules
  for all to authenticated
  using (public.owns_motorcycle(motorcycle_id)) with check (public.owns_motorcycle(motorcycle_id));

create policy "logs of own bikes" on public.maintenance_logs
  for all to authenticated
  using (public.owns_motorcycle(motorcycle_id)) with check (public.owns_motorcycle(motorcycle_id));

create policy "odometer of own bikes" on public.odometer_readings
  for all to authenticated
  using (public.owns_motorcycle(motorcycle_id)) with check (public.owns_motorcycle(motorcycle_id));

create policy "own favorites" on public.favorite_workshops
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own devices" on public.devices
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ═════════════════════════ Default maintenance items ═══════════════════
-- Generic intervals — users should adjust them to their owner's manual.
insert into public.maintenance_types (name, default_interval_km, default_interval_days, icon, sort_order) values
  ('Engine oil',             3000,  180, 'droplet',      10),
  ('Oil filter',             6000,  365, 'filter',       20),
  ('Coolant',               20000,  730, 'thermometer',  30),
  ('Front tyre',            15000, 1095, 'circle',       40),
  ('Rear tyre',             15000, 1095, 'circle',       50),
  ('Tyre pressure check',    null,   14, 'gauge',        60),
  ('Chain clean & lube',      800,   30, 'link',         70),
  ('Chain & sprocket set',  20000, null, 'cog',          80),
  ('Brake pads (front)',    10000,  365, 'disc',         90),
  ('Brake pads (rear)',     10000,  365, 'disc',        100),
  ('Brake fluid',            null,  730, 'droplets',    110),
  ('Spark plug',            10000,  365, 'zap',         120),
  ('Air filter',            10000,  365, 'wind',        130),
  ('Battery',                null,  730, 'battery',     140),
  ('CVT belt (scooters)',   20000,  730, 'refresh-cw',  150),
  ('Road tax / insurance',   null,  365, 'file-text',   160);
