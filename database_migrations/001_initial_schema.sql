-- 001_initial_schema.sql
-- SIAA Base Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (Profile linked to Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'tenant')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- 2. PROPERTIES
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('residential', 'commercial')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage properties" ON public.properties USING (auth.role() = 'authenticated');

-- 3. UNITS
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartment', 'office', 'local', 'storage')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    rent_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage units" ON public.units USING (auth.role() = 'authenticated');

-- 4. TENANTS
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Linked Auth User
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tenants" ON public.tenants USING (auth.role() = 'authenticated');

-- 5. CONTRACTS
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'terminated')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contracts" ON public.contracts USING (auth.role() = 'authenticated');

-- 6. PAYMENTS (Schema updated for reconciliation)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    method VARCHAR(50) CHECK (method IN ('transfer', 'cash', 'zelle', 'pago_movil')),
    reference VARCHAR(100), -- Transaction ID
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    proof_url TEXT, -- URL to image/pdf
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.payments USING (auth.role() = 'authenticated');

-- 7. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notifications" ON public.notifications USING (auth.role() = 'authenticated');

-- 8. TEMPLATES
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), 
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.notification_templates USING (auth.role() = 'authenticated');
