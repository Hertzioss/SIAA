# Database Schema - SIAA (Sistema Integral de Administración de Arrendamientos)

This document outlines the database structure required to support the SIAA application.

## Overview

The database is designed to manage properties, owners (individuals and companies), tenants, contracts, and financial transactions. It supports a hierarchical property structure (Buildings -> Units) and complex ownership models.

## Tables

### 1. Users (`users`)
System administrators and operators.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email for login |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `role` | VARCHAR(20) | NOT NULL | Role (e.g., 'admin', 'operator') |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

### 2. Owners (`owners`)
Property owners, can be individuals or legal entities.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `type` | VARCHAR(20) | NOT NULL | 'individual' or 'company' |
| `name` | VARCHAR(200) | NOT NULL | Full Name or Company Name |
| `doc_id` | VARCHAR(50) | UNIQUE, NOT NULL | CI or RIF |
| `email` | VARCHAR(255) | | Contact email |
| `phone` | VARCHAR(50) | | Contact phone |
| `address` | TEXT | | Physical/Fiscal address |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

### 3. Owner Beneficiaries (`owner_beneficiaries`)
Shareholders or partners of a company owner.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `owner_id` | UUID | FK -> owners.id | The company this person belongs to |
| `name` | VARCHAR(200) | NOT NULL | Beneficiary Name |
| `doc_id` | VARCHAR(50) | NOT NULL | CI or ID |
| `participation_percentage` | DECIMAL(5,2) | NOT NULL | Percentage of ownership in the company |

### 4. Properties (`properties`)
Main property entities (e.g., Buildings, Shopping Centers, or Standalone Houses).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(200) | NOT NULL | Property Name (e.g., "Residencias El Valle") |
| `type` | VARCHAR(50) | NOT NULL | 'building', 'commercial_center', 'standalone' |
| `address` | TEXT | NOT NULL | Full address |
| `total_area` | DECIMAL(10,2) | | Total land/construction area |
| `floors` | INTEGER | | Number of floors (if applicable) |
| `description` | TEXT | | General description |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

### 5. Property Owners (`property_owners`)
Many-to-Many relationship between Properties and Owners.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `property_id` | UUID | FK -> properties.id | |
| `owner_id` | UUID | FK -> owners.id | |
| `percentage` | DECIMAL(5,2) | NOT NULL | Ownership percentage of this property |
| `PRIMARY KEY` | (property_id, owner_id) | | |

### 6. Units (`units`)
Rentable units within a property (e.g., Apartment 101, Office 500).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `property_id` | UUID | FK -> properties.id | Parent property |
| `name` | VARCHAR(100) | NOT NULL | Unit identifier (e.g., "Apto 101") |
| `type` | VARCHAR(50) | NOT NULL | 'apartment', 'office', 'local', 'storage' |
| `floor` | VARCHAR(20) | | Floor number/name |
| `area` | DECIMAL(10,2) | | Unit area in m² |
| `default_rent_amount` | DECIMAL(10,2) | | Base rent price |
| `status` | VARCHAR(20) | NOT NULL | 'vacant', 'occupied', 'maintenance' |

### 7. Tenants (`tenants`)
People or companies renting the units.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(200) | NOT NULL | Full Name |
| `doc_id` | VARCHAR(50) | UNIQUE, NOT NULL | CI or RIF |
| `email` | VARCHAR(255) | | Contact email |
| `phone` | VARCHAR(50) | | Contact phone |
| `status` | VARCHAR(20) | NOT NULL | 'solvent', 'delinquent' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

### 8. Contracts (`contracts`)
Lease agreements between Tenants and Units.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `unit_id` | UUID | FK -> units.id | The unit being rented |
| `tenant_id` | UUID | FK -> tenants.id | The tenant |
| `contract_number` | VARCHAR(50) | UNIQUE | Internal contract number |
| `start_date` | DATE | NOT NULL | |
| `end_date` | DATE | NOT NULL | |
| `rent_amount` | DECIMAL(10,2) | NOT NULL | Agreed monthly rent |
| `deposit_amount` | DECIMAL(10,2) | | Security deposit |
| `status` | VARCHAR(20) | NOT NULL | 'active', 'expired', 'cancelled' |
| `type` | VARCHAR(20) | | 'residential', 'commercial' |
| `file_url` | TEXT | | Link to PDF document |

### 9. Payments (`payments`)
Payment records.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `contract_id` | UUID | FK -> contracts.id | Related contract |
| `tenant_id` | UUID | FK -> tenants.id | Payer (redundant but useful) |
| `date` | DATE | NOT NULL | Payment date |
| `amount` | DECIMAL(10,2) | NOT NULL | Amount paid |
| `concept` | VARCHAR(200) | NOT NULL | Description (e.g., "Canon Noviembre") |
| `status` | VARCHAR(20) | NOT NULL | 'paid', 'pending', 'overdue' |
| `payment_method` | VARCHAR(50) | | 'transfer', 'cash', 'zelle' |
| `reference_number` | VARCHAR(100) | | Transaction ID |

### 10. Expenses (`expenses`)
Records of expenses related to properties or units.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `property_id` | UUID | FK -> properties.id | Related property |
| `unit_id` | UUID | FK -> units.id | Related unit (optional) |
| `date` | DATE | NOT NULL | Expense date |
| `amount` | DECIMAL(10,2) | NOT NULL | Expense amount |
| `category` | VARCHAR(50) | NOT NULL | 'maintenance', 'utilities', 'tax', 'other' |
| `description` | TEXT | | Details of the expense |
| `status` | VARCHAR(20) | NOT NULL | 'paid', 'pending' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | |

### 11. Interactions (`interactions`)
CRM-like log of interactions with tenants.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique identifier |
| `tenant_id` | UUID | FK -> tenants.id | |
| `user_id` | UUID | FK -> users.id | User who recorded the interaction |
| `date` | TIMESTAMP | DEFAULT NOW() | |
| `type` | VARCHAR(50) | | 'call', 'email', 'meeting', 'note' |
| `notes` | TEXT | | Content of the interaction |

## Relationships Summary

- **Properties** have many **Units**.
- **Properties** have many **Owners** (and Owners have many Properties).
- **Companies** (Owners) have many **Beneficiaries**.
- **Units** can have one active **Contract**.
- **Contracts** belong to one **Tenant** and one **Unit**.
- **Payments** belong to a **Contract**.
- **Interactions** belong to a **Tenant**.

## SQL Instructions (PostgreSQL)

Run the following SQL commands to create the database schema:

```sql
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
```
