-- Verification queries for release schema alignment.
-- Run after migrations and confirm no rows are missing in each check.

-- 1) Required runtime tables
select required.table_name as missing_table
from (
  values
    ('profiles'),
    ('tests'),
    ('questions'),
    ('attempts'),
    ('bookmarks'),
    ('test_progress'),
    ('purchase_receipts')
) as required(table_name)
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = required.table_name
where t.table_name is null;

-- 2) Required tests columns
select required.column_name as missing_tests_column
from (
  values
    ('id'),
    ('title'),
    ('total_tests'),
    ('total_questions'),
    ('duration_minutes'),
    ('price')
) as required(column_name)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'tests'
 and c.column_name = required.column_name
where c.column_name is null;

-- 3) Required attempts columns
select required.column_name as missing_attempts_column
from (
  values
    ('id'),
    ('user_id'),
    ('test_id'),
    ('status'),
    ('answers'),
    ('questions')
) as required(column_name)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'attempts'
 and c.column_name = required.column_name
where c.column_name is null;

-- 4) test_progress constraints
select
  tc.constraint_name,
  tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name = 'test_progress'
  and tc.constraint_type in ('PRIMARY KEY');

-- 5) RLS enabled checks
select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'tests', 'questions', 'attempts', 'bookmarks', 'test_progress', 'purchase_receipts')
order by tablename;

-- 6) Runtime policies snapshot
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'tests', 'questions', 'attempts', 'bookmarks', 'test_progress', 'purchase_receipts')
order by tablename, policyname;
