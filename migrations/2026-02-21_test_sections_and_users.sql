-- 1) Create Test Sections
create table if not exists public.test_sections (
    id uuid primary key default gen_random_uuid(),
    test_id uuid not null references public.tests(id) on delete cascade,
    name text not null,
    duration_minutes integer default 0,
    order_index integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS for test_sections
alter table public.test_sections enable row level security;

-- Policies for test_sections
drop policy if exists "Test sections are viewable by everyone" on public.test_sections;
create policy "Test sections are viewable by everyone"
  on public.test_sections for select using (true);

drop policy if exists "Only admins can insert test sections" on public.test_sections;
create policy "Only admins can insert test sections"
  on public.test_sections for insert with check (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Only admins can update test sections" on public.test_sections;
create policy "Only admins can update test sections"
  on public.test_sections for update using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Only admins can delete test sections" on public.test_sections;
create policy "Only admins can delete test sections"
  on public.test_sections for delete using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- 2) Add section_id to questions
alter table public.questions add column if not exists section_id uuid references public.test_sections(id) on delete set null;

-- 3) Add user management fields (is_suspended)
alter table public.profiles add column if not exists is_suspended boolean default false;

-- Enhance attempts viewability for admin
drop policy if exists "Admins can view all attempts" on public.attempts;
create policy "Admins can view all attempts"
  on public.attempts for select using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- Admin Profiles policies
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- 4) Platform Configuration
create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  maintenance_mode boolean default false,
  mock_fallbacks_enabled boolean default true,
  android_version_code integer default 1,
  ios_version_code integer default 1,
  global_announcement text,
  payment_gateway_active boolean default true,
  updated_at timestamptz default now()
);

-- Force single row pattern
create unique index if not exists platform_settings_single_row_idx on public.platform_settings((true));

alter table public.platform_settings enable row level security;

drop policy if exists "Settings viewable by everyone" on public.platform_settings;
create policy "Settings viewable by everyone"
  on public.platform_settings for select using (true);

drop policy if exists "Only admins can insert settings" on public.platform_settings;
create policy "Only admins can insert settings"
  on public.platform_settings for insert with check (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Only admins can update settings" on public.platform_settings;
create policy "Only admins can update settings"
  on public.platform_settings for update using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

-- Seed initial row
insert into public.platform_settings (id, maintenance_mode, mock_fallbacks_enabled, android_version_code, ios_version_code, payment_gateway_active)
values (gen_random_uuid(), false, true, 1, 1, true)
on conflict do nothing;
