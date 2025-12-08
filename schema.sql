-- SIAA Unified Database Schema
-- Generated/Consolidated on 2024-05-30

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users (Linked to Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'tenant')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- 3. Owners
CREATE TABLE public.owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage owners" ON public.owners USING (auth.role() = 'authenticated');

-- 4. Owner Beneficiaries
CREATE TABLE public.owner_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) NOT NULL,
    participation_percentage DECIMAL(5,2) NOT NULL
);
ALTER TABLE public.owner_beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage beneficiaries" ON public.owner_beneficiaries USING (auth.role() = 'authenticated');

-- 5. Property Types
CREATE TABLE public.property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO public.property_types (name, label) VALUES
('building', 'Edificio Residencial'),
('commercial_center', 'Centro Comercial'),
('standalone', 'Unidad Independiente')
ON CONFLICT (name) DO NOTHING;

-- 6. Properties
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    property_type_id UUID REFERENCES public.property_types(id),
    address TEXT NOT NULL,
    total_area DECIMAL(10,2),
    floors INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage properties" ON public.properties USING (auth.role() = 'authenticated');

-- 7. Property Owners
CREATE TABLE public.property_owners (
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (property_id, owner_id)
);
ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage property owners" ON public.property_owners USING (auth.role() = 'authenticated');

-- 8. Owner Bank Accounts
CREATE TABLE public.owner_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ahorro', 'corriente', 'internacional')),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'VES')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.owner_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage owner_bank_accounts" ON public.owner_bank_accounts USING (auth.role() = 'authenticated');

-- 9. Units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartment', 'office', 'local', 'storage')),
    floor VARCHAR(20),
    area DECIMAL(10,2) DEFAULT 0,
    default_rent_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage units" ON public.units USING (auth.role() = 'authenticated');

-- 10. Tenants
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Optional link to auth
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tenants" ON public.tenants USING (auth.role() = 'authenticated');

-- 11. Contracts
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id),
    tenant_id UUID REFERENCES public.tenants(id),
    contract_number VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'terminated')),
    type VARCHAR(20) CHECK (type IN ('residential', 'commercial')),
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contracts" ON public.contracts USING (auth.role() = 'authenticated');

-- 12. Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    owner_bank_account_id UUID REFERENCES public.owner_bank_accounts(id),
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    concept VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'approved', 'rejected')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('transfer', 'cash', 'zelle', 'pago_movil')),
    reference_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,4),
    notes TEXT,
    proof_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.payments USING (auth.role() = 'authenticated');
CREATE INDEX idx_payments_owner_bank_account ON public.payments(owner_bank_account_id);

-- 13. Expenses
CREATE TABLE public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('maintenance', 'utilities', 'tax', 'other')),
    description TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- 14. Maintenance Requests
CREATE TABLE public.maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.maintenance_requests FOR ALL USING (auth.role() = 'authenticated');

-- 15. Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'alert', 'info', 'contract')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Policy: Admins see all
CREATE POLICY "Admins/Operators manage all notifications" ON public.notifications
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'operator')
    )
);
-- Policy: Tenants see own
CREATE POLICY "Tenants view own notifications" ON public.notifications
FOR SELECT
USING (
    tenant_id IN (
        SELECT id FROM public.tenants 
        WHERE user_id = auth.uid()
    )
);

-- 16. Notification Templates
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.notification_templates USING (auth.role() = 'authenticated');

-- 17. Interactions
CREATE TABLE public.interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    date TIMESTAMP DEFAULT NOW(),
    type VARCHAR(50),
    notes TEXT
);

-- 18. Triggers & Functions

-- Updated At Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Expense Trigger
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Maintenance Trigger
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User Creation Trigger (Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
        COALESCE(new.raw_user_meta_data->>'role', 'operator')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
