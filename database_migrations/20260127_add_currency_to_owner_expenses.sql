-- Migration: Add currency to owner_expenses

ALTER TABLE owner_expenses 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

COMMENT ON COLUMN owner_expenses.currency IS 'Currency of the expense (USD or Bs)';
