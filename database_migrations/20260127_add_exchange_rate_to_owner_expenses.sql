-- Migration: Add exchange_rate to owner_expenses

ALTER TABLE owner_expenses 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);

COMMENT ON COLUMN owner_expenses.exchange_rate IS 'Exchange rate (Bs/USD) at the time of expense';
