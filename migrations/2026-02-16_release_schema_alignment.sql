-- Canonical release schema alignment.
-- Runtime tables: profiles, tests, questions, attempts, bookmarks, test_progress.
-- Legacy table library_items is retained but not used by app runtime.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles
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

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_pro boolean default false;
alter table public.profiles add column if not exists streak integer default 0;
alter table public.profiles add column if not exists last_active_at timestamptz default now();
alter table public.profiles add column if not exists created_at timestamptz default now();

alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tests
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

alter table public.tests add column if not exists total_tests integer default 1;
alter table public.tests add column if not exists total_questions integer;
alter table public.tests add column if not exists duration_minutes integer;
alter table public.tests add column if not exists price numeric default 0;
alter table public.tests add column if not exists created_at timestamptz default now();

alter table public.tests enable row level security;
drop policy if exists "Tests are viewable by everyone." on public.tests;
drop policy if exists "Tests are viewable by everyone" on public.tests;
create policy "Tests are viewable by everyone"
  on public.tests for select
  using (true);

-- Questions
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

alter table public.questions add column if not exists type text default 'MCQ';
alter table public.questions add column if not exists created_at timestamptz default now();

alter table public.questions enable row level security;
drop policy if exists "Questions are viewable by everyone." on public.questions;
drop policy if exists "Questions are viewable by everyone" on public.questions;
create policy "Questions are viewable by everyone"
  on public.questions for select
  using (true);

-- Attempts
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

alter table public.attempts drop constraint if exists attempts_test_id_fkey;
alter table public.attempts alter column test_id type text;
alter table public.attempts add column if not exists questions jsonb default '[]'::jsonb;
alter table public.attempts add column if not exists answers jsonb;

alter table public.attempts enable row level security;
drop policy if exists "Users can view own attempts." on public.attempts;
drop policy if exists "Users can view own attempts" on public.attempts;
create policy "Users can view own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own attempts." on public.attempts;
drop policy if exists "Users can insert own attempts" on public.attempts;
create policy "Users can insert own attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own attempts." on public.attempts;
drop policy if exists "Users can update own attempts" on public.attempts;
create policy "Users can update own attempts"
  on public.attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bookmarks (runtime replacement for legacy library_items)
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

alter table public.bookmarks enable row level security;
drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
create policy "Users can view their own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert their own bookmarks" on public.bookmarks;
create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own bookmarks" on public.bookmarks;
create policy "Users can update their own bookmarks"
  on public.bookmarks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- In-progress resume state
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

alter table public.test_progress enable row level security;
drop policy if exists "Users can view their own progress" on public.test_progress;
create policy "Users can view their own progress"
  on public.test_progress for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert/update their own progress" on public.test_progress;
create policy "Users can insert/update their own progress"
  on public.test_progress for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own progress" on public.test_progress;
create policy "Users can update their own progress"
  on public.test_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own progress" on public.test_progress;
create policy "Users can delete their own progress"
  on public.test_progress for delete
  using (auth.uid() = user_id);

-- Legacy note: retained for compatibility only.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'library_items'
  ) then
    comment on table public.library_items is
      'Legacy table: release runtime uses public.bookmarks.';
  end if;
end $$;
