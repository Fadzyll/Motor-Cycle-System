-- GPS-tracked rides. Only distance and time are stored — never the route or any location.
-- Run in Supabase: SQL Editor → paste → Run

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_km numeric(8, 2) not null check (distance_km >= 0),
  duration_s int not null check (duration_s >= 0),
  max_speed_kmh numeric(5, 1) check (max_speed_kmh >= 0),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);
create index rides_bike_idx on public.rides (motorcycle_id, started_at desc);

alter table public.rides enable row level security;

create policy "rides of own bikes" on public.rides
  for all to authenticated
  using (public.owns_motorcycle(motorcycle_id)) with check (public.owns_motorcycle(motorcycle_id));
