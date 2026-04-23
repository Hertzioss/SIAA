-- =============================================================================
-- SIAA — Schema Unificado
-- Última actualización: 2026-04-23
-- Incluye todas las tablas, funciones, triggers y políticas RLS.
-- Ejecutar en Supabase SQL Editor en una instancia nueva o limpia.
-- =============================================================================

-- =============================================================================
-- 0. EXTENSIONES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 1. FUNCIONES AUXILIARES
-- =============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Función para verificar si el usuario autenticado es admin u operador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'operator', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para auto-registrar usuarios de Auth en public.users
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


-- =============================================================================
-- 2. USUARIOS (vinculados a Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'operator', 'tenant', 'owner')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.users;
CREATE POLICY "Users view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Trigger: crear registro en public.users al registrar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 3. TIPOS DE PROPIEDAD (Catálogo)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.property_types (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(50)  NOT NULL UNIQUE,
    label      VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.property_types;
CREATE POLICY "Enable read access for authenticated users" ON public.property_types
    FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 4. PROPIETARIOS (Owners)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.owners (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES auth.users(id),
    type       VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
    name       VARCHAR(200) NOT NULL,
    doc_id     VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    address    TEXT,
    logo_url   TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage owners" ON public.owners;
CREATE POLICY "Admins manage owners" ON public.owners
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owners view own profile" ON public.owners;
CREATE POLICY "Owners view own profile" ON public.owners
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);


-- =============================================================================
-- 5. BENEFICIARIOS DE PROPIETARIOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.owner_beneficiaries (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id                UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    name                    VARCHAR(200) NOT NULL,
    doc_id                  VARCHAR(50) NOT NULL,
    participation_percentage DECIMAL(5,2) NOT NULL
);

ALTER TABLE public.owner_beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage beneficiaries" ON public.owner_beneficiaries;
CREATE POLICY "Admins manage beneficiaries" ON public.owner_beneficiaries
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 6. CUENTAS BANCARIAS DE PROPIETARIOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.owner_bank_accounts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id       UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    bank_name      VARCHAR(100) NOT NULL,
    account_number VARCHAR(50)  NOT NULL,
    account_type   VARCHAR(20)  NOT NULL CHECK (account_type IN ('ahorro', 'corriente', 'internacional')),
    currency       VARCHAR(10)  NOT NULL CHECK (currency IN ('USD', 'VES')),
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.owner_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage owner_bank_accounts" ON public.owner_bank_accounts;
CREATE POLICY "Admins manage owner_bank_accounts" ON public.owner_bank_accounts
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 7. PROPIEDADES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(200) NOT NULL,
    address          TEXT NOT NULL,
    property_type_id UUID REFERENCES public.property_types(id),
    total_area       DECIMAL(10,2),
    floors           INTEGER,
    description      TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage properties" ON public.properties;
CREATE POLICY "Admins manage properties" ON public.properties
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 8. PROPIETARIOS DE PROPIEDADES (Tabla de relación)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.property_owners (
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id    UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    percentage  DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (property_id, owner_id)
);

ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage property owners" ON public.property_owners;
CREATE POLICY "Admins manage property owners" ON public.property_owners
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 9. UNIDADES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.units (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id         UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    type                VARCHAR(50)  NOT NULL,
    floor               VARCHAR(20),
    area                DECIMAL(10,2) DEFAULT 0,
    default_rent_amount DECIMAL(10,2) DEFAULT 0,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage units" ON public.units;
CREATE POLICY "Admins manage units" ON public.units
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 10. INQUILINOS (Tenants)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES auth.users(id),
    name       VARCHAR(200) NOT NULL,
    doc_id     VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    birth_date DATE,
    status     VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage tenants" ON public.tenants;
CREATE POLICY "Admins manage tenants" ON public.tenants
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 11. CONTACTOS DE INQUILINOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_contacts (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id  UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    relation   VARCHAR(50) CHECK (relation IN ('family', 'partner', 'worker', 'other')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenant_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenant_contacts;
CREATE POLICY "Enable all access for authenticated users" ON public.tenant_contacts
    FOR ALL USING (auth.role() = 'authenticated');


-- =============================================================================
-- 12. CONTRATOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.contracts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID REFERENCES public.units(id),
    tenant_id       UUID REFERENCES public.tenants(id),
    contract_number VARCHAR(50) UNIQUE,
    start_date      DATE NOT NULL,
    end_date        DATE,                   -- Nullable: contratos indefinidos
    rent_amount     DECIMAL(10,2) NOT NULL,
    deposit_amount  DECIMAL(10,2),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'terminated')),
    type            VARCHAR(20) CHECK (type IN ('residential', 'commercial')),
    file_url        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contracts" ON public.contracts;
CREATE POLICY "Admins manage contracts" ON public.contracts
    USING (auth.role() = 'authenticated');


-- =============================================================================
-- 13. PAGOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id           UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    tenant_id             UUID REFERENCES public.tenants(id),
    owner_bank_account_id UUID REFERENCES public.owner_bank_accounts(id),
    date                  DATE NOT NULL,
    amount                DECIMAL(10,2) NOT NULL,
    concept               VARCHAR(200) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'overdue')),
    payment_method        VARCHAR(50) CHECK (payment_method IN ('transfer', 'cash', 'zelle', 'pago_movil')),
    reference_number      VARCHAR(100),
    currency              VARCHAR(10) DEFAULT 'USD',
    exchange_rate         DECIMAL(10,4),
    notes                 TEXT,
    proof_url             TEXT,
    billing_period        DATE,
    metadata              JSONB DEFAULT '{}'::jsonb,
    registration_source   VARCHAR(20) DEFAULT 'admin' CHECK (registration_source IN ('tenant', 'admin')),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments
    USING (auth.role() = 'authenticated');

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_payments_owner_bank_account ON public.payments(owner_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date              ON public.payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id         ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id       ON public.payments(contract_id);

-- Comentarios descriptivos
COMMENT ON COLUMN public.payments.exchange_rate    IS 'Tasa de cambio (VES/USD) al momento del registro del pago';
COMMENT ON COLUMN public.payments.metadata         IS 'Snapshot histórico de datos del inquilino/contrato al momento del pago';
COMMENT ON COLUMN public.payments.billing_period   IS 'Período de facturación al que aplica el pago (primer día del mes)';


-- =============================================================================
-- 14. GASTOS (Expenses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id     UUID REFERENCES public.units(id) ON DELETE SET NULL,
    category    TEXT NOT NULL CHECK (category IN ('maintenance', 'utilities', 'tax', 'other')),
    description TEXT,
    amount      NUMERIC NOT NULL,
    date        DATE NOT NULL,
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    receipt_url TEXT,
    created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.expenses;
CREATE POLICY "Enable all access for authenticated users" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 15. SOLICITUDES DE MANTENIMIENTO
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id     UUID REFERENCES public.units(id) ON DELETE SET NULL,
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    description TEXT,
    priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status      TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.maintenance_requests;
CREATE POLICY "Enable all access for authenticated users" ON public.maintenance_requests
    FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 16. NOTIFICACIONES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id   UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    type      VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'alert', 'info', 'contract')),
    title     VARCHAR(200) NOT NULL,
    message   TEXT NOT NULL,
    is_read   BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notifications"          ON public.notifications;
DROP POLICY IF EXISTS "Admins/Operators manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins view all notifications"        ON public.notifications;
DROP POLICY IF EXISTS "Tenants view own notifications"       ON public.notifications;

CREATE POLICY "Admins manage notifications" ON public.notifications
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own notifications" ON public.notifications
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE user_id = auth.uid()
        )
    );


-- =============================================================================
-- 17. PLANTILLAS DE NOTIFICACIÓN
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT NOT NULL,
    type       VARCHAR(50) NOT NULL CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage templates" ON public.notification_templates;
CREATE POLICY "Admins manage templates" ON public.notification_templates
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- =============================================================================
-- 18. GASTOS DE PROPIETARIOS (Owner Expenses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.owner_expenses (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id      UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
    property_id   UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    date          DATE NOT NULL,
    amount        NUMERIC NOT NULL,
    description   TEXT NOT NULL,
    category      TEXT,
    currency      VARCHAR(3)    DEFAULT 'USD',
    exchange_rate DECIMAL(10,4),
    receipt_url   TEXT,
    status        TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at    TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.owner_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.owner_expenses;
CREATE POLICY "Enable all access for authenticated users" ON public.owner_expenses
    FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON COLUMN public.owner_expenses.currency      IS 'Moneda del gasto (USD o Bs)';
COMMENT ON COLUMN public.owner_expenses.exchange_rate IS 'Tasa de cambio (Bs/USD) al momento del gasto';


-- =============================================================================
-- 19. INGRESOS DE PROPIETARIOS (Owner Incomes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.owner_incomes (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id      UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
    property_id   UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    date          DATE NOT NULL,
    amount        NUMERIC NOT NULL,
    currency      TEXT NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC,
    description   TEXT,
    category      TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.owner_incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users"   ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable insert for authenticated users"        ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable update for authenticated users"        ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable delete for authenticated users"        ON public.owner_incomes;

CREATE POLICY "Enable read access for authenticated users"  ON public.owner_incomes AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users"       ON public.owner_incomes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users"       ON public.owner_incomes AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users"       ON public.owner_incomes AS PERMISSIVE FOR DELETE TO authenticated USING (true);


-- =============================================================================
-- 20. INTERACCIONES (Historial de comunicaciones)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.interactions (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id   UUID REFERENCES public.users(id),
    date      TIMESTAMPTZ DEFAULT NOW(),
    type      VARCHAR(50),
    notes     TEXT
);


-- =============================================================================
-- 21. EMPRESAS / CONFIGURACIÓN DEL SISTEMA (Companies)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name       VARCHAR(255) NOT NULL DEFAULT 'Escritorio Legal',
    rif        VARCHAR(50)  DEFAULT 'J-00000000-0',
    address    TEXT         DEFAULT 'Dirección Fiscal',
    phone      VARCHAR(50)  DEFAULT '+58 212 000-0000',
    email      VARCHAR(255) DEFAULT 'contacto@escritorio.legal',
    logo_url   TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage companies" ON public.companies;
CREATE POLICY "Admins manage companies" ON public.companies
    USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 22. STORAGE — Buckets y políticas
-- =============================================================================

-- Bucket: Logos de propietarios
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-logos', 'owner-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access"                           ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos"    ON storage.objects;

CREATE POLICY "Public Access owner-logos"
    ON storage.objects FOR SELECT USING (bucket_id = 'owner-logos');

CREATE POLICY "Authenticated users can upload owner logos"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'owner-logos' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update owner logos"
    ON storage.objects FOR UPDATE WITH CHECK (
        bucket_id = 'owner-logos' AND auth.role() = 'authenticated'
    );

-- Bucket: Logos de empresa
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access company-logos"
    ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload company logos"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'company-logos' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update company logos"
    ON storage.objects FOR UPDATE WITH CHECK (
        bucket_id = 'company-logos' AND auth.role() = 'authenticated'
    );
