-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  is_pro boolean default false,
  streak integer default 0,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. TESTS (Catalog)
create table public.tests (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  category text, -- 'UPSC', 'Banking'
  difficulty text, -- 'Easy', 'Medium', 'Hard'
  total_tests integer default 1,
  duration_minutes integer,
  total_questions integer,
  price numeric default 0, -- 0 for free
  cover_image_url text,
  created_at timestamptz default now()
);

-- 3. QUESTIONS
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references public.tests(id),
  text text not null,
  options jsonb not null, -- Array of strings
  correct_answer integer not null, -- Index 0-3
  explanation text,
  subject text, -- 'History', 'Polity'
  difficulty text,
  type text default 'MCQ',
  created_at timestamptz default now()
);

-- 4. ATTEMPTS (History)
create table public.attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  test_id text not null,
  score numeric,
  total_marks numeric,
  status text check (status in ('In Progress', 'Completed', 'Abandoned')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  time_spent_seconds integer default 0,
  answers jsonb, -- Record<questionId, optionIndex>
  questions jsonb -- Snapshot of question data used in this attempt
);

-- 5. LIBRARY (Saved/Wrong Questions)
create table public.library_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  question_id uuid references public.questions(id),
  type text check (type in ('saved', 'wrong', 'learn')),
  note text,
  saved_at timestamptz default now()
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.library_items enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create policy "Tests are viewable by everyone." on public.tests for select using (true);
create policy "Questions are viewable by everyone." on public.questions for select using (true);

create policy "Users can view own attempts." on public.attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts." on public.attempts for insert with check (auth.uid() = user_id);
create policy "Users can update own attempts." on public.attempts for update using (auth.uid() = user_id);

create policy "Users can manage library." on public.library_items for all using (auth.uid() = user_id);
