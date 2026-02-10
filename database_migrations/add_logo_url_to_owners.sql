-- Add logo_url column to owners table
ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- Create bucket for owner logos (if it doesn't exist, this needs to be done in Supabase UI or via API, but here is the policy)
-- Note: You might need to create the 'owner-logos' bucket manually in the Storage section of Supabase.
-- Policy to allow public read access to owner logos
-- RUN THIS IN SUPABASE SQL EDITOR
BEGIN;
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-logos', 'owner-logos', true) ON CONFLICT (id) DO NOTHING;
-- Allow public access to view logos
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'owner-logos');
-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'owner-logos'
        AND auth.role() = 'authenticated'
    );
-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR
UPDATE WITH CHECK (
        bucket_id = 'owner-logos'
        AND auth.role() = 'authenticated'
    );
COMMIT;