-- Adds time-bound subscription metadata to profiles.
-- is_pro remains the fast entitlement flag, while pro_expires_at stores expiry.

alter table public.profiles
  add column if not exists pro_plan text;

alter table public.profiles
  add column if not exists pro_expires_at timestamptz;
