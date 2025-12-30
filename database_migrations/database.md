# Database Schema - Escritorio Legal

This document outlines the database structure required to support the Escritorio Legal application.

## Overview

The database is designed to manage properties, owners (individuals and companies), tenants, contracts, and financial transactions. It supports a hierarchical property structure (Buildings -> Units) and complex ownership models.

## Tables

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS (Vinculada a Supabase Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'tenant', 'owner')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS (Seguridad) en usuarios
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- POLÍTICA: Todo usuario autenticado puede LEER datos (necesario para el login)
-- Pero NO creamos política de UPDATE, así que no pueden editarse a sí mismos.
CREATE POLICY "Usuarios pueden ver perfiles" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. OWNERS
CREATE TABLE public.owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Linked Auth User
    type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. OWNER BENEFICIARIES
CREATE TABLE public.owner_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) NOT NULL,
    participation_percentage DECIMAL(5,2) NOT NULL
);

-- 5. PROPERTY TYPES
CREATE TABLE public.property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'building', 'commercial_center'
    label VARCHAR(100) NOT NULL,      -- e.g., 'Edificio / Conjunto'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar tipos por defecto
INSERT INTO public.property_types (name, label) VALUES
('building', 'Edificio Residencial'),
('commercial_center', 'Centro Comercial'),
('standalone', 'Unidad Independiente');

-- 6. PROPERTIES
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    property_type_id UUID REFERENCES public.property_types(id), -- Relación con tipos dinámicos
    address TEXT NOT NULL,
    total_area DECIMAL(10,2),
    floors INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. PROPERTY OWNERS (Many-to-Many)
CREATE TABLE public.property_owners (
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (property_id, owner_id)
);

-- 7. UNITS
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartment', 'office', 'local', 'storage')),
    floor VARCHAR(20),
    area DECIMAL(10,2),
    default_rent_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance'))
);

-- 8. TENANTS
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. CONTRACTS
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id),
    tenant_id UUID REFERENCES public.tenants(id),
    contract_number VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    type VARCHAR(20) CHECK (type IN ('residential', 'commercial')),
    file_url TEXT
);

-- 10. PAYMENTS
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id),
    tenant_id UUID REFERENCES public.tenants(id),
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    concept VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,2),
    notes TEXT,
    proof_url TEXT
);

-- 11. EXPENSES
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('maintenance', 'utilities', 'tax', 'other')),
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. INTERACTIONS
CREATE TABLE public.interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id), -- Referencia a tu tabla users vinculada
    date TIMESTAMP DEFAULT NOW(),
    type VARCHAR(50),
    notes TEXT
);


alter table public.owners enable row level security;

create policy "Usuarios autenticados pueden ver owners"
on public.owners for select
using (auth.role() = 'authenticated');


-- 1. Permitir CREAR (Insert)
create policy "Usuarios pueden crear owners"
on public.owners for insert
with check (auth.role() = 'authenticated');

-- 2. Permitir ACTUALIZAR (Update) - Para que no te bloquee al editar luego
create policy "Usuarios pueden editar owners"
on public.owners for update
using (auth.role() = 'authenticated');

-- 3. Permitir BORRAR (Delete)
create policy "Usuarios pueden borrar owners"
on public.owners for delete
using (auth.role() = 'authenticated');

-- MIGRATION: 2024-05-30 - Add columns to payments
-- ALTER TABLE public.payments ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
-- ALTER TABLE public.payments ADD COLUMN exchange_rate DECIMAL(10,2);
-- ALTER TABLE public.payments ADD COLUMN notes TEXT;
-- ALTER TABLE public.payments ADD COLUMN proof_url TEXT;

-- 13. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Destinatario (OPCIONAL, si es null es para todos los admins)
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL, -- Si está relacionada a un inquilino
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'alert', 'info', 'contract')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins/Operators can manage all notifications
CREATE POLICY "Admins manage notifications" ON public.notifications
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 14. AUTH HOOKS & TRIGGERS (User Management)

-- Function to automatically create a public user profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
        COALESCE(new.raw_user_meta_data->>'role', 'operator') -- Default role
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper to create notification (can be called from other triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_tenant_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, tenant_id, type, title, message)
    VALUES (p_user_id, p_tenant_id, p_type, p_title, p_message);
END;
$$ LANGUAGE plpgsql;

-- 15. COMMUNICATION TEMPLATES
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- RLS for Templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON public.notification_templates
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');