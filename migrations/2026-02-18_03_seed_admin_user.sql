-- Seed: Promote User to Super Admin
-- Date: 2026-02-18
-- Description: Promotes 'nehrar677@gmail.com' to Super Admin.

-- This script looks up the user's UUID from auth.users based on the email.
-- If the user does not exist in auth.users, nothing happens (safe).

DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'nehrar677@gmail.com';
BEGIN
    -- 1. Find the user's UUID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    -- 2. Insert into admin_users if found
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.admin_users (user_id, role, full_name, is_active)
        VALUES (target_user_id, 'super_admin', 'Rahul Nehra', true)
        ON CONFLICT (user_id) DO UPDATE
        SET role = 'super_admin', is_active = true;
        
        RAISE NOTICE 'User % (UUID: %) has been promoted to Super Admin.', target_email, target_user_id;
    ELSE
        RAISE NOTICE 'User % not found in auth.users. Please sign up in the app first.', target_email;
    END IF;
END $$;
