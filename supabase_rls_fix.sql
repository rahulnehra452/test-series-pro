-- Enable Row Level Security (RLS) on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT (View)
-- Allow users to view ONLY their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- 2. Policy for UPDATE
-- Allow users to update ONLY their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING ( auth.uid() = id );

-- 3. Policy for INSERT
-- Allow users to insert their own profile (usually handled by trigger, but good to have)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = id );

-- Note: No DELETE policy needed usually, but if so:
-- DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
-- CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING ( auth.uid() = id );
