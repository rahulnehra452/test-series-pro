-- Migration: Admin Panel Foundation
-- Date: 2026-02-18
-- Description: Establishes the admin_users table and security roles.

-- 1. Create Admin Roles Enum
-- These match the requirements: Super Admin, Content Manager, Moderator, Support Agent.
DO $$ BEGIN
    CREATE TYPE public.admin_role AS ENUM ('super_admin', 'content_manager', 'moderator', 'support_agent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Admin Users Table
-- Links to auth.users but defines strict admin roles.
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role public.admin_role NOT NULL DEFAULT 'content_manager',
    full_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for admin_users
-- Security Rule: Only Super Admins can manage this table.
-- Admins can view their own record to check their role.

CREATE POLICY "Super Admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users au
        WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.is_active = TRUE
    )
);

CREATE POLICY "Admins can view their own profile"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- 5. Helper Function to Check Role (for cleaner policies later)
-- Usage: auth.is_admin() or auth.has_role('content_manager')
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
