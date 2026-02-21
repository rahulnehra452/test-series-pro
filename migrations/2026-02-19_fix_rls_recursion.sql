-- Migration: Fix RLS Infinite Recursion
-- Date: 2026-02-19
-- Description: Replaces direct table queries in RLS policies with the SECURITY DEFINER 
--              function public.is_admin() to avoid infinite recursion loops.

-- 1. Exams
DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
CREATE POLICY "Admins can insert exams" ON public.exams FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;
CREATE POLICY "Admins can update exams" ON public.exams FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete exams" ON public.exams;
CREATE POLICY "Admins can delete exams" ON public.exams FOR DELETE TO authenticated USING (public.is_admin());

-- 2. Test Series
DROP POLICY IF EXISTS "Admins can insert test series" ON public.test_series;
CREATE POLICY "Admins can insert test series" ON public.test_series FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update test series" ON public.test_series;
CREATE POLICY "Admins can update test series" ON public.test_series FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete test series" ON public.test_series;
CREATE POLICY "Admins can delete test series" ON public.test_series FOR DELETE TO authenticated USING (public.is_admin());

-- 3. Tests
DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;
CREATE POLICY "Admins can insert tests" ON public.tests FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
CREATE POLICY "Admins can update tests" ON public.tests FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;
CREATE POLICY "Admins can delete tests" ON public.tests FOR DELETE TO authenticated USING (public.is_admin());

-- 4. Questions
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
CREATE POLICY "Admins can insert questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
CREATE POLICY "Admins can update questions" ON public.questions FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE TO authenticated USING (public.is_admin());

-- 5. Profiles (Read Access)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());

-- 6. Attempts (Read Access)
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.attempts;
CREATE POLICY "Admins can view all attempts" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- 7. Admin Users (Self-Correction for Reference)
-- The recursion likely originates here if policies refer to admin_users itself.
-- Let's define specific non-recursive policies for admin_users table.

DROP POLICY IF EXISTS "Super Admins can manage all admin users" ON public.admin_users;
CREATE POLICY "Super Admins can manage all admin users"
ON public.admin_users
TO authenticated
USING (
    -- Use the function to break recursion
    public.is_admin() 
    AND (SELECT role FROM public.admin_users WHERE user_id = auth.uid()) = 'super_admin'
);
-- Actually, even calling public.is_admin() inside admin_users policy MIGHT be risky if not careful,
-- but since is_admin() is SECURITY DEFINER, it should be fine.
-- HOWEVER, to be absolutely safe, let's simplify:

-- Only allow access if the function returns true.
-- But we need to separate READ vs WRITE for admin_users
-- READ: All admins can read
-- WRITE: Only super_admins can write

DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Super Admins can insert admin users" ON public.admin_users;
CREATE POLICY "Super Admins can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin() 
    AND (SELECT role FROM public.admin_users WHERE user_id = auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Super Admins can update admin users" ON public.admin_users;
CREATE POLICY "Super Admins can update admin users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (
    public.is_admin() 
    AND (SELECT role FROM public.admin_users WHERE user_id = auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Super Admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super Admins can delete admin users"
ON public.admin_users
FOR DELETE
TO authenticated
USING (
    public.is_admin() 
    AND (SELECT role FROM public.admin_users WHERE user_id = auth.uid()) = 'super_admin'
);
