-- Phase 2: Admin Audit Log table + Question ordering
-- Run this in Supabase SQL Editor

-- 1. Audit Log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Add order_index to questions if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='order_index') THEN
    ALTER TABLE questions ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- 3. RLS for audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (admin client)
CREATE POLICY "admin_audit_log_all" ON admin_audit_log
  FOR ALL USING (true) WITH CHECK (true);
