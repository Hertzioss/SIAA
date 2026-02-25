-- SIAA Full Database Migration Script
-- Generated for new instance setup
-- Includes Schema, Migrations, Seeds, and Admin User Creation
-- ==============================================================================
-- 0. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ==============================================================================
-- 1. BASE SCHEMA (From 001_initial_schema.sql)
-- ==============================================================================
-- 1. USERS (Profile linked to Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'tenant', 'owner')),
    -- Pre-patched role check
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
CREATE POLICY "Users view own profile" ON public.users FOR
SELECT USING (auth.uid() = id);
-- 2. PROPERTY TYPES (Catalog)
CREATE TABLE IF NOT EXISTS public.property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
-- Allow read access
CREATE POLICY "Enable read access for authenticated users" ON public.property_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Seed Property Types immediately
INSERT INTO public.property_types (name, label) VALUES
('building', 'Edificio Residencial'),
('commercial_center', 'Centro Comercial'),
('standalone', 'Unidad Independiente'),
('multifamily', 'Conjunto Residencial'),
('office_building', 'Torre de Oficinas')
ON CONFLICT (name) DO NOTHING;

-- 3. PROPERTIES
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    property_type_id UUID REFERENCES public.property_types(id), -- Linked to Catalog
    total_area DECIMAL(10,2),
    floors INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage properties" ON public.properties;
CREATE POLICY "Admins manage properties" ON public.properties USING (auth.role() = 'authenticated');
-- 3. UNITS
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('apartment', 'office', 'local', 'storage')
    ),
    status VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    rent_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage units" ON public.units;
CREATE POLICY "Admins manage units" ON public.units USING (auth.role() = 'authenticated');
-- 4. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage tenants" ON public.tenants;
CREATE POLICY "Admins manage tenants" ON public.tenants USING (auth.role() = 'authenticated');
-- 5. CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id),
    start_date DATE NOT NULL,
    end_date DATE,
    -- Nullable (patched)
    rent_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'terminated')),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage contracts" ON public.contracts;
CREATE POLICY "Admins manage contracts" ON public.contracts USING (auth.role() = 'authenticated');
-- 6. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    method VARCHAR(50) CHECK (
        method IN ('transfer', 'cash', 'zelle', 'pago_movil')
    ),
    reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'approved',
            'rejected',
            'paid',
            'overdue'
        )
    ),
    proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments USING (auth.role() = 'authenticated');
-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- 8. TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage templates" ON public.notification_templates;
CREATE POLICY "Admins manage templates" ON public.notification_templates USING (auth.role() = 'authenticated');
-- 9. OWNERS (Missing from 001 but referenced in Schema)
CREATE TABLE IF NOT EXISTS public.owners (
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
DROP POLICY IF EXISTS "Admins manage owners" ON public.owners;
CREATE POLICY "Admins manage owners" ON public.owners USING (auth.role() = 'authenticated');
-- 10. PROPERTY OWNERS (Join Table)
CREATE TABLE IF NOT EXISTS public.property_owners (
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    percentage DECIMAL(5, 2) NOT NULL,
    PRIMARY KEY (property_id, owner_id)
);
ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage property owners" ON public.property_owners;
CREATE POLICY "Admins manage property owners" ON public.property_owners USING (auth.role() = 'authenticated');
-- ==============================================================================
-- 2. APPLYING MIGRATIONS (consolidated)
-- ==============================================================================
-- 002: Owner Bank Accounts
CREATE TABLE IF NOT EXISTS public.owner_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (
        account_type IN ('ahorro', 'corriente', 'internacional')
    ),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'VES')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE public.owner_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage owner_bank_accounts" ON public.owner_bank_accounts;
CREATE POLICY "Admins manage owner_bank_accounts" ON public.owner_bank_accounts USING (auth.role() = 'authenticated');
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS owner_bank_account_id UUID REFERENCES public.owner_bank_accounts(id);
CREATE INDEX IF NOT EXISTS idx_payments_owner_bank_account ON public.payments(owner_bank_account_id);
-- 003: Exchange Rate
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);
COMMENT ON COLUMN public.payments.exchange_rate IS 'Exchange rate (VES/USD) at the moment of payment registration';
-- 005 & 015: Expenses & Maintenance
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE
    SET NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount NUMERIC NOT NULL,
        date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
        receipt_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.expenses;
CREATE POLICY "Enable all access for authenticated users" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE
    SET NULL,
        tenant_id UUID REFERENCES public.tenants(id) ON DELETE
    SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT DEFAULT 'open' CHECK (
            status IN ('open', 'in_progress', 'resolved', 'closed')
        ),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        resolved_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.maintenance_requests;
CREATE POLICY "Enable all access for authenticated users" ON public.maintenance_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = timezone('utc'::text, now());
RETURN NEW;
END;
$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE
UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_updated_at BEFORE
UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- 006: Units Area
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS area NUMERIC DEFAULT 0;
-- 007: Tenant Contacts
CREATE TABLE IF NOT EXISTS public.tenant_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    relation VARCHAR(50) CHECK (
        relation IN ('family', 'partner', 'worker', 'other')
    ),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tenant_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenant_contacts;
CREATE POLICY "Enable all access for authenticated users" ON public.tenant_contacts FOR ALL USING (auth.role() = 'authenticated');
-- 008: Tenant Birth Date
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS birth_date DATE;
-- 009: Tenant User ID (Already in base create, but ensuring)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tenants'
        AND column_name = 'user_id'
) THEN
ALTER TABLE public.tenants
ADD COLUMN user_id UUID REFERENCES auth.users(id);
END IF;
END $$;
-- 010 & 004: Notifications Permissions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('admin', 'operator', 'owner') -- Expanded to include owner based on role constraint
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins/Operators manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Tenants view own notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Tenants view own notifications" ON public.notifications FOR
SELECT USING (
        tenant_id IN (
            SELECT id
            FROM public.tenants
            WHERE user_id = auth.uid()
        )
    );
-- 013: Payment Foreign Key Fix
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_contract_id_fkey;
ALTER TABLE public.payments
ADD CONSTRAINT payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;
-- 014: Contracts (Indefinite) - Handled in Base Create Table (nullable end_date)
-- 016: Owner User ID
ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);
DROP POLICY IF EXISTS "Owners view own profile" ON public.owners;
CREATE POLICY "Owners view own profile" ON public.owners FOR
SELECT USING (auth.uid() = user_id);
-- 017: Users Role Constraint - Handled in Base Create Table
-- 018: Owner Expenses
CREATE TABLE IF NOT EXISTS public.owner_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE
    SET NULL,
        receipt_url TEXT,
        status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled'))
);
ALTER TABLE public.owner_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.owner_expenses;
CREATE POLICY "Enable all access for authenticated users" ON public.owner_expenses FOR ALL USING (auth.role() = 'authenticated');
-- 2026 Currency & Exchange
ALTER TABLE owner_expenses
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
COMMENT ON COLUMN owner_expenses.currency IS 'Currency of the expense (USD or Bs)';
ALTER TABLE owner_expenses
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);
COMMENT ON COLUMN owner_expenses.exchange_rate IS 'Exchange rate (Bs/USD) at the time of expense';
-- ==============================================================================
-- 3. TRIGGERS & FUNCTIONS (Auth Handling)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.users (id, email, full_name, role)
VALUES (
        new.id,
        new.email,
        COALESCE(
            new.raw_user_meta_data->>'full_name',
            'Nuevo Usuario'
        ),
        COALESCE(new.raw_user_meta_data->>'role', 'operator')
    ) ON CONFLICT (id) DO NOTHING;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ==============================================================================
-- 4. SEED DATA
-- ==============================================================================
INSERT INTO public.notification_templates (name, title, message, type)
VALUES (
        'Bienvenida Nuevo Inquilino',
        'Bienvenido a su nuevo hogar - {propiedad}',
        'Estimado {inquilino}, nos complace darle la bienvenida a {propiedad}. Estamos a su disposición para cualquier duda o consulta. Esperamos que disfrute su estancia.',
        'info'
    ),
    (
        'Recordatorio de Pago de Renta',
        'Aviso de Pago - Mes de {mes}',
        'Hola {inquilino}, le recordamos que el pago de la renta correspondiente al mes de {mes} por un monto de {monto} vence el día {vencimiento}. Por favor realizar el pago a tiempo para evitar recargos.',
        'payment'
    ),
    (
        'Recibo de Pago',
        'Confirmación de Pago Recibido',
        'Hemos recibido su pago de {monto} correspondiente al concepto de {concepto}. Gracias por su puntualidad.',
        'payment'
    ),
    (
        'Mantenimiento Programado',
        'Aviso de Mantenimiento en Áreas Comunes',
        'Informamos que el día {fecha} se realizarán trabajos de mantenimiento en {area}. Es posible que se presenten interrupciones breves en el servicio. Agradecemos su comprensión.',
        'info'
    ),
    (
        'Aviso de Falta de Pago',
        'URGENTE: Pago Pendiente Detectado',
        'Estimado {inquilino}, nuestros registros indican que no hemos recibido el pago de su renta del mes de {mes}. Le solicitamos regularizar su situación a la brevedad para evitar acciones adicionales.',
        'alert'
    ),
    (
        'Propuesta de Renovación',
        'Vencimiento de Contrato Próximo',
        'Su contrato de arrendamiento está próximo a vencer el día {fecha_fin}. Nos gustaría conversar sobre la renovación del mismo. Por favor póngase en contacto con la administración.',
        'contract'
    ),
    (
        'Aviso de Inspección',
        'Programación de Inspección Rutinaria',
        'Como parte de nuestro programa de mantenimiento, necesitamos realizar una breve inspección de su unidad el día {fecha} a las {hora}. Por favor confirme su disponibilidad.',
        'contract'
    ),
    (
        'Convocatoria a Reunión',
        'Invitación a Reunión de Residentes',
        'Se convoca a todos los residentes a una reunión general el día {fecha} para tratar temas de interés común sobre el funcionamiento del edificio/conjunto.',
        'info'
    ),
    (
        'Recordatorio de Normas',
        'Recordatorio sobre Normas de Ruido y Convivencia',
        'Recordamos a todos los residentes la importancia de respetar los horarios de silencio y las normas de convivencia en las áreas comunes para el bienestar de todos.',
        'info'
    ),
    (
        'Aviso de Suspensión',
        'AVISO URGENTE: Suspensión de Servicios',
        'Debido a la falta de pago acumulada, nos vemos en la obligación de notificarle sobre la posible suspensión de servicios/acceso el día {fecha} si no se regulariza la deuda total de {deuda}.',
        'alert'
    ) ON CONFLICT (id) DO NOTHING;
-- Assuming random IDs, usually conflict is rare on inserts unless fixed IDs used.
-- ==============================================================================
-- 5. CREATE ADMIN USER
-- ==============================================================================
-- Create Admin User in auth.users
-- Password is 'password123'
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'admin@siaa.com',
        crypt('password123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Admin Principal","role":"admin"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    );
-- Note: The trigger 'on_auth_user_created' defined above will automatically 
-- create the corresponding record in public.users with the 'admin' role.