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
ADD COLUMN IF NOT EXISTS property_type_id UUID REFERENCES public.property_types(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS floors INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_area DECIMAL(10,2) DEFAULT 0;

-- 4. Relax constraint on legacy 'type' column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'type') THEN
        ALTER TABLE public.properties ALTER COLUMN type DROP NOT NULL;
    END IF;
END $$;

-- 5. Fix Units table (Add missing default_rent_amount and relax constraints)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS default_rent_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS area DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor VARCHAR(10);

-- Relax unit type constraint to allow more values or just drop it if needed
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_type_check;

-- 6. Add 'type' column to contracts table (Missing in schema)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) CHECK (type IN ('residential', 'commercial'));

-- 7. Add 'tenant_id' to payments table (for direct payments or redundancy)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) CHECK (currency IN ('USD', 'VES')),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS concept TEXT,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), -- Renaming/Mapping from method? No, adding new one to be safe
ADD COLUMN IF NOT EXISTS owner_bank_account_id UUID, -- Optional FK
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS billing_period DATE,
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- Optional: If 'method' exists but 'payment_method' is used by app, we might need to migrate or ensure app uses one.
-- frontend/types/payment.ts uses 'payment_method'. 
-- 001_initial_schema.sql uses 'method'.
-- Let's ensure 'payment_method' is the one used or aliased. 
-- For now, adding 'payment_method' solves the insert error.
-- Re-add with broader categories if you want, or just leave it open. 
-- For now, let's keep it open or just add parameters.


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
