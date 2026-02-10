-- Create companies table for system configuration
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Escritorio Legal',
    rif VARCHAR(50) DEFAULT 'J-00000000-0',
    address TEXT DEFAULT 'Dirección Fiscal',
    phone VARCHAR(50) DEFAULT '+58 212 000-0000',
    email VARCHAR(255) DEFAULT 'contacto@escritorio.legal',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything
CREATE POLICY "Admins manage companies" ON public.companies
    USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default company if not exists
INSERT INTO public.companies (name, rif, address, phone, email)
SELECT 'Escritorio Legal', 'J-12345678-9', 'Av. Principal, Torre Empresarial', '+58 212 555-5555', 'admin@escritorio.legal'
WHERE NOT EXISTS (SELECT 1 FROM public.companies);

-- Create bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access Company Logos" ON storage.objects FOR SELECT USING ( bucket_id = 'company-logos' );

CREATE POLICY "Authenticated users can upload company logos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update company logos" ON storage.objects FOR UPDATE WITH CHECK (
  bucket_id = 'company-logos' AND auth.role() = 'authenticated'
);
