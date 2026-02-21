-- Migration: Update Questions Table
-- Date: 2026-02-18
-- Description: Adds marks and negative_marks to questions table to support Test Series Pro features.

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks numeric DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS negative_marks numeric DEFAULT 0;

-- Optional: Ensure text column is used for question text
-- (Existing column is 'text', our admin panel uses 'question_text' in forms, we will map it in server actions)
