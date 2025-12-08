-- 007_tenant_contacts.sql

-- Create Tenant Contacts Table
CREATE TABLE IF NOT EXISTS public.tenant_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    relation VARCHAR(50) CHECK (relation IN ('family', 'partner', 'worker', 'other')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_contacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all access for authenticated users" ON public.tenant_contacts
    FOR ALL USING (auth.role() = 'authenticated');
