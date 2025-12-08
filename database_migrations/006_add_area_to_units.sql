-- Add area column to units table
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS area NUMERIC DEFAULT 0;
