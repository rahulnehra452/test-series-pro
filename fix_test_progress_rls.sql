-- Fix RLS policies for test_progress table
-- This script ensures that all necessary policies exist and are correctly configured.

-- 1. Enable RLS (idempotent)
alter table public.test_progress enable row level security;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Users can view their own progress" on public.test_progress;
drop policy if exists "Users can insert/update their own progress" on public.test_progress;
drop policy if exists "Users can update their own progress" on public.test_progress;
drop policy if exists "Users can delete their own progress" on public.test_progress;

-- 3. Recreate policies
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

-- Verify grants (optional but good practice)
grant all on public.test_progress to authenticated;
grant all on public.test_progress to service_role;
