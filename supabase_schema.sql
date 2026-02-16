-- Canonical schema for current app runtime.
-- Runtime tables: profiles, tests, questions, attempts, bookmarks, test_progress, purchase_receipts.
-- Legacy table: library_items (kept only for backward compatibility).

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_pro boolean default false,
  streak integer default 0,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2) TESTS (catalog)
create table if not exists public.tests (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text,
  difficulty text,
  total_tests integer default 1,
  duration_minutes integer,
  total_questions integer,
  price numeric default 0,
  cover_image_url text,
  created_at timestamptz default now()
);

-- 3) QUESTIONS
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  test_id uuid references public.tests(id),
  text text not null,
  options jsonb not null,
  correct_answer integer not null,
  explanation text,
  subject text,
  difficulty text,
  type text default 'MCQ',
  created_at timestamptz default now()
);

-- 4) ATTEMPTS (history + question snapshot)
create table if not exists public.attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  score numeric,
  total_marks numeric,
  status text check (status in ('In Progress', 'Completed', 'Abandoned')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  time_spent_seconds integer default 0,
  answers jsonb,
  questions jsonb
);

-- 5) BOOKMARKS (runtime library storage)
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  type text not null check (type in ('bookmark', 'wrong', 'note')),
  question_data jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, question_id, type)
);

-- 6) TEST PROGRESS (resume state)
create table if not exists public.test_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  current_index integer default 0,
  answers jsonb default '{}'::jsonb,
  marked_for_review jsonb default '{}'::jsonb,
  time_spent jsonb default '{}'::jsonb,
  time_remaining integer,
  last_updated_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (user_id, test_id)
);

-- 7) PURCHASE RECEIPTS (server verification log + replay defense)
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

-- Legacy (not used by runtime)
create table if not exists public.library_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.questions(id),
  type text check (type in ('saved', 'wrong', 'learn')),
  note text,
  saved_at timestamptz default now()
);

comment on table public.library_items is
  'Legacy table retained for backward compatibility. Runtime uses public.bookmarks.';

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.test_progress enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.library_items enable row level security;

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Public catalog policies
drop policy if exists "Tests are viewable by everyone" on public.tests;
create policy "Tests are viewable by everyone"
  on public.tests for select using (true);
drop policy if exists "Questions are viewable by everyone" on public.questions;
create policy "Questions are viewable by everyone"
  on public.questions for select using (true);

-- Attempts policies
drop policy if exists "Users can view own attempts" on public.attempts;
create policy "Users can view own attempts"
  on public.attempts for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own attempts" on public.attempts;
create policy "Users can insert own attempts"
  on public.attempts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own attempts" on public.attempts;
create policy "Users can update own attempts"
  on public.attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookmarks policies
drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
create policy "Users can view their own bookmarks"
  on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own bookmarks" on public.bookmarks;
create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own bookmarks" on public.bookmarks;
create policy "Users can update their own bookmarks"
  on public.bookmarks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete using (auth.uid() = user_id);

-- test_progress policies
drop policy if exists "Users can view their own progress" on public.test_progress;
create policy "Users can view their own progress"
  on public.test_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert/update their own progress" on public.test_progress;
create policy "Users can insert/update their own progress"
  on public.test_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own progress" on public.test_progress;
create policy "Users can update their own progress"
  on public.test_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own progress" on public.test_progress;
create policy "Users can delete their own progress"
  on public.test_progress for delete using (auth.uid() = user_id);

-- purchase_receipts policies
drop policy if exists "Users can read own purchase receipts" on public.purchase_receipts;
create policy "Users can read own purchase receipts"
  on public.purchase_receipts for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own purchase receipts" on public.purchase_receipts;
create policy "Users can insert own purchase receipts"
  on public.purchase_receipts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own purchase receipts" on public.purchase_receipts;
create policy "Users can update own purchase receipts"
  on public.purchase_receipts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- legacy library_items policy
drop policy if exists "Users can manage library" on public.library_items;
create policy "Users can manage library"
  on public.library_items for all using (auth.uid() = user_id);
