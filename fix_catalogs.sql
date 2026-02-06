-- Fix Schema and Seed Catalogs
-- Run this if you already ran the previous full_migration.sql
-- This adds the missing 'property_types' table and updates 'properties' to use it.

-- 1. Create Property Types Table
CREATE TABLE IF NOT EXISTS public.property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Seed Property Types
INSERT INTO public.property_types (name, label) VALUES
('building', 'Edificio Residencial'),
('commercial_center', 'Centro Comercial'),
('standalone', 'Unidad Independiente'),
('multifamily', 'Conjunto Residencial'),
('office_building', 'Torre de Oficinas')
ON CONFLICT (name) DO NOTHING;

-- 3. Modify Properties Table to use Foreign Key
-- Note: If you have existing data in 'properties', this column will be null initially.
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_type_id UUID REFERENCES public.property_types(id);

-- Optional: Attempt to migrate existing 'type' string data to 'property_type_id' if possible
-- UPDATE public.properties p
-- SET property_type_id = pt.id
-- FROM public.property_types pt
-- WHERE p.type = 'residential' AND pt.name = 'building'; -- Example mapping

-- 4. Enable RLS on new table
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
-- Allow read access to authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.property_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Owner Beneficiaries (Also missing from previous script)
CREATE TABLE IF NOT EXISTS public.owner_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) NOT NULL,
    participation_percentage DECIMAL(5,2) NOT NULL
);
ALTER TABLE public.owner_beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage beneficiaries" ON public.owner_beneficiaries USING (auth.role() = 'authenticated');

-- 6. Ensure Notification Templates (Repetition safe due to ON CONFLICT in previous script, but good to ensure)
-- (Included in full_migration.sql, so skipped here unless requested)
