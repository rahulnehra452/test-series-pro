-- Create bookmarks table
create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_id text not null, -- Can be UUID or text depending on source
  type text not null check (type in ('bookmark', 'wrong', 'note')),
  question_data jsonb, -- Store question text/options for offline access/cache
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, question_id, type)
);

-- Enable RLS for bookmarks
alter table public.bookmarks enable row level security;

create policy "Users can view their own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookmarks"
  on public.bookmarks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- Create test_progress table
create table if not exists public.test_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  test_id text not null,
  current_index integer default 0,
  answers jsonb default '{}'::jsonb,
  marked_for_review jsonb default '{}'::jsonb,
  time_spent jsonb default '{}'::jsonb,
  time_remaining integer,
  last_updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, test_id)
);

-- Enable RLS for test_progress
alter table public.test_progress enable row level security;

create policy "Users can view their own progress"
  on public.test_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own progress"
  on public.test_progress for insert
  with check (auth.uid() = user_id);
  
create policy "Users can update their own progress"
  on public.test_progress for update
  using (auth.uid() = user_id);
  
create policy "Users can delete their own progress"
  on public.test_progress for delete
  using (auth.uid() = user_id);
