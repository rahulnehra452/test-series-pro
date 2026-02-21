-- Fix for Admin Users RLS (Infinite Recursion and Security Hole)
-- Date: 2026-02-21
-- Description: Enables RLS on admin_users and uses SECURITY DEFINER functions
--              to prevent infinite recursion while keeping the database fully secure.

-- 1. Create a secure function to check for any admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- 2. Create a secure function to check for super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
$$;

-- 3. Re-enable RLS on admin_users!
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any broken or infinite-recursion causing policies
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view their own profile" ON public.admin_users;
DROP POLICY IF EXISTS "Super Admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin profile" ON public.admin_users;

-- 5. Re-apply correct non-recursive policies
-- Users can always see their own row
CREATE POLICY "Users can view own admin profile"
ON public.admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Any admin can view the entire admin user list
CREATE POLICY "Admins can view all admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only Super Admins can insert/update/delete 
CREATE POLICY "Super Admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
