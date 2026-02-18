-- Seed Data for Multi-Exam Architecture
-- Run this AFTER applying the schema migration.

-- 1. Insert Exams
INSERT INTO public.exams (title, slug, icon_url, is_active)
VALUES 
  ('UPSC Civil Services', 'upsc-cse', 'school', true),
  ('SSC CGL', 'ssc-cgl', 'business', true),
  ('Banking Exams', 'banking', 'cash', true),
  ('Railways (RRB)', 'railways', 'train', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Test Series (using sub-selects to get IDs)
-- UPSC Series
INSERT INTO public.test_series (exam_id, title, description, price, is_active)
SELECT id, 'UPSC Prelims 2025 GS', 'Comprehensive General Studies series for Prelims 2025', 999, true
FROM public.exams WHERE slug = 'upsc-cse';

INSERT INTO public.test_series (exam_id, title, description, price, is_active)
SELECT id, 'UPSC CSAT Mastery', 'Targeted practice for CSAT qualifying paper', 499, true
FROM public.exams WHERE slug = 'upsc-cse';

-- SSC Series
INSERT INTO public.test_series (exam_id, title, description, price, is_active)
SELECT id, 'SSC CGL Tier 1 Mock Tests', 'Full length mock tests for Tier 1', 299, true
FROM public.exams WHERE slug = 'ssc-cgl';

-- Banking Series
INSERT INTO public.test_series (exam_id, title, description, price, is_active)
SELECT id, 'IBPS PO Prelims', 'High difficulty puzzles and DI sets', 399, true
FROM public.exams WHERE slug = 'banking';

-- 3. Link Existing Tests to Series (Optional / Best Effort)
-- This tries to link existing tests based on string matching if possible, otherwise they remain orphan
UPDATE public.tests
SET series_id = (
  SELECT ts.id FROM public.test_series ts 
  JOIN public.exams e ON ts.exam_id = e.id 
  WHERE e.slug = 'upsc-cse' AND ts.title = 'UPSC Prelims 2025 GS' 
  LIMIT 1
)
WHERE title ILIKE '%UPSC%' OR title ILIKE '%GS%';

UPDATE public.tests
SET series_id = (
  SELECT ts.id FROM public.test_series ts 
  JOIN public.exams e ON ts.exam_id = e.id 
  WHERE e.slug = 'ssc-cgl' 
  LIMIT 1
)
WHERE title ILIKE '%SSC%' OR title ILIKE '%CGL%';
