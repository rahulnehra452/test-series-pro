-- Migration: Admin Read Access for Content
-- Date: 2026-02-19
-- Description: Grants admins read access to content tables so they can verify data.

-- Exams
DROP POLICY IF EXISTS "Admins can view all exams" ON public.exams;
CREATE POLICY "Admins can view all exams" ON public.exams FOR SELECT TO authenticated USING (public.is_admin());

-- Test Series
DROP POLICY IF EXISTS "Admins can view all test_series" ON public.test_series;
CREATE POLICY "Admins can view all test_series" ON public.test_series FOR SELECT TO authenticated USING (public.is_admin());

-- Tests
DROP POLICY IF EXISTS "Admins can view all tests" ON public.tests;
CREATE POLICY "Admins can view all tests" ON public.tests FOR SELECT TO authenticated USING (public.is_admin());

-- Questions
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;
CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT TO authenticated USING (public.is_admin());
