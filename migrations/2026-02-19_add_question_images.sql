-- Migration: Add Questions Image Support
-- Date: 2026-02-19
-- Description: Adds image_url column to questions table and creates storage bucket.

-- 1. Add image_url column to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create Storage Bucket for Question Images
-- Note: 'storage.buckets' and 'storage.objects' are managed by Supabase Storage extension.
-- We insert into storage.buckets if it doesn't already exist.

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set RLS Policies for Storage
-- Allow public read access to question images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'question-images' );

-- Allow authenticated admins to upload/insert images
CREATE POLICY "Admin Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images' AND
  (public.is_admin() OR auth.role() = 'service_role')
);

-- Allow authenticated admins to update images
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  (public.is_admin() OR auth.role() = 'service_role')
);

-- Allow authenticated admins to delete images
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images' AND
  (public.is_admin() OR auth.role() = 'service_role')
);
