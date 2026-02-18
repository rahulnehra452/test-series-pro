-- Migration: Multi-Exam Architecture
-- Date: 2026-02-18
-- Description: Introduces 'exams' and 'test_series' hierarchy.

-- 1. Create Exams Table
create table if not exists public.exams (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  icon_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.exams enable row level security;
create policy "Exams are viewable by everyone" on public.exams for select using (true);

-- 2. Create Test Series Table
create table if not exists public.test_series (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade,
  title text not null,
  description text,
  price numeric default 0,
  cover_image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.test_series enable row level security;
create policy "Test Series are viewable by everyone" on public.test_series for select using (true);

-- 3. Update Tests Table
-- Link tests to test_series. 
-- Note: existing tests will have null series_id initially.
alter table public.tests add column if not exists series_id uuid references public.test_series(id);

-- Move 'price' and 'total_tests' semantics to test_series, but we can keep them in tests for backward compat or single-sale tests if needed.
-- For this migration, we wont delete columns to avoid data loss, but we will make series_id important.

-- 4. Bookmarks / Library
-- Add exam_id to bookmarks to allow filtering "My Bookmarks" by Exam.
alter table public.bookmarks add column if not exists exam_id uuid references public.exams(id);

-- 5. Seed Data (Optional - specific to your setup, but helpful structure)
-- insert into public.exams (title, slug) values ('UPSC Civil Services', 'upsc'), ('SSC CGL', 'ssc-cgl') on conflict do nothing;
