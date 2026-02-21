-- Migration: Admin Panel RLS Policies & Schema Alignment
-- Date: 2026-02-19
-- Description: Adds write access policies for admin users on content tables,
--              and adds missing columns to tests table.

-- ============================================================
-- 1. Add missing columns to tests table
-- ============================================================
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS total_marks numeric DEFAULT 100;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS pass_marks numeric DEFAULT 33;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ============================================================
-- 2. RLS Policies for Exams (Admin Write Access)
-- ============================================================

-- Insert policy for admins
DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
CREATE POLICY "Admins can insert exams"
ON public.exams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- Update policy for admins
DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
CREATE POLICY "Admins can update exams"
ON public.exams
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- Delete policy for admins
DROP POLICY IF EXISTS "Admins can delete exams" ON public.exams;
CREATE POLICY "Admins can delete exams"
ON public.exams
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- ============================================================
-- 3. RLS Policies for Test Series (Admin Write Access)
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert test series" ON public.test_series;
CREATE POLICY "Admins can insert test series"
ON public.test_series
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can update test series" ON public.test_series;
CREATE POLICY "Admins can update test series"
ON public.test_series
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can delete test series" ON public.test_series;
CREATE POLICY "Admins can delete test series"
ON public.test_series
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- ============================================================
-- 4. RLS Policies for Tests (Admin Write Access)
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;
CREATE POLICY "Admins can insert tests"
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
CREATE POLICY "Admins can update tests"
ON public.tests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;
CREATE POLICY "Admins can delete tests"
ON public.tests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- ============================================================
-- 5. RLS Policies for Questions (Admin Write Access)
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
CREATE POLICY "Admins can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
CREATE POLICY "Admins can update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
CREATE POLICY "Admins can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- ============================================================
-- 6. Profiles - Admin Read Access (to see all users)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);

-- ============================================================
-- 7. Attempts - Admin Read Access (for analytics)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.attempts;
CREATE POLICY "Admins can view all attempts"
ON public.attempts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = TRUE
  )
);
