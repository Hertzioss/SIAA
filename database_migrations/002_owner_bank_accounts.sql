-- 002_owner_bank_accounts.sql

-- 1. Create Owner Bank Accounts Table
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

-- Enable RLS
ALTER TABLE public.owner_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policies (Admins manage everything)
CREATE POLICY "Admins manage owner_bank_accounts" ON public.owner_bank_accounts 
    USING (auth.role() = 'authenticated');

-- 2. Update Payments Table to link to Bank Account
ALTER TABLE public.payments 
ADD COLUMN owner_bank_account_id UUID REFERENCES public.owner_bank_accounts(id);

-- 3. Add index for performance
CREATE INDEX idx_payments_owner_bank_account ON public.payments(owner_bank_account_id);
