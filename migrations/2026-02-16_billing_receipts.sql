-- Billing receipts table for server-side purchase verification and replay protection.
create extension if not exists "pgcrypto";

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google_play')),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  purchase_token text not null,
  order_id text,
  purchase_state integer,
  acknowledgement_state integer,
  raw_payload jsonb not null,
  verified_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(provider, purchase_token)
);

create index if not exists idx_purchase_receipts_user_id
  on public.purchase_receipts (user_id);

create index if not exists idx_purchase_receipts_provider_product
  on public.purchase_receipts (provider, product_id);

alter table public.purchase_receipts enable row level security;

drop policy if exists "Users can read own purchase receipts" on public.purchase_receipts;
create policy "Users can read own purchase receipts"
  on public.purchase_receipts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own purchase receipts" on public.purchase_receipts;
create policy "Users can insert own purchase receipts"
  on public.purchase_receipts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own purchase receipts" on public.purchase_receipts;
create policy "Users can update own purchase receipts"
  on public.purchase_receipts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
