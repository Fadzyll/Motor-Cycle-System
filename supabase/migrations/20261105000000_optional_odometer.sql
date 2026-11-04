-- Odometer is optional: a bike with a broken/unknown meter is tracked by date only.
-- Run in Supabase: SQL Editor → paste → Run   (safe to run once; existing data is kept)

alter table public.motorcycles alter column current_odometer drop not null;
alter table public.motorcycles alter column current_odometer drop default;

alter table public.maintenance_logs alter column odometer drop not null;
