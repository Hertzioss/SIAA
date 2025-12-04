-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Owners
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'company')),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Owner Beneficiaries
CREATE TABLE owner_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) NOT NULL,
    participation_percentage DECIMAL(5,2) NOT NULL
);

-- 4. Properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('building', 'commercial_center', 'standalone')),
    address TEXT NOT NULL,
    total_area DECIMAL(10,2),
    floors INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Property Owners (Many-to-Many)
CREATE TABLE property_owners (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (property_id, owner_id)
);

-- 6. Units
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apartment', 'office', 'local', 'storage')),
    floor VARCHAR(20),
    area DECIMAL(10,2),
    default_rent_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('vacant', 'occupied', 'maintenance'))
);

-- 7. Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('solvent', 'delinquent')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Contracts
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id),
    tenant_id UUID REFERENCES tenants(id),
    contract_number VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    type VARCHAR(20) CHECK (type IN ('residential', 'commercial')),
    file_url TEXT
);

-- 9. Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    tenant_id UUID REFERENCES tenants(id),
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    concept VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100)
);

-- 10. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('maintenance', 'utilities', 'tax', 'other')),
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Interactions
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    date TIMESTAMP DEFAULT NOW(),
    type VARCHAR(50),
    notes TEXT
);
