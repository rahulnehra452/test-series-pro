-- Add scheduled_for fields to exams, series, and tests
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
