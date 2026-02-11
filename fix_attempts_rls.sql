-- Enable RLS on attempts table just in case it was enabled by default or accident
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Allow users to INSERT their own attempts
DROP POLICY IF EXISTS "Users can insert own attempts" ON attempts;
CREATE POLICY "Users can insert own attempts"
ON attempts FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = user_id );

-- Allow users to SELECT their own attempts
DROP POLICY IF EXISTS "Users can view own attempts" ON attempts;
CREATE POLICY "Users can view own attempts"
ON attempts FOR SELECT
TO authenticated
USING ( auth.uid() = user_id );

-- Allow users to UPDATE their own attempts (if needed, e.g. for sync?)
-- Usually attempts are insert-only, but just in case
DROP POLICY IF EXISTS "Users can update own attempts" ON attempts;
CREATE POLICY "Users can update own attempts"
ON attempts FOR UPDATE
TO authenticated
USING ( auth.uid() = user_id );
