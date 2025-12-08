-- 003_add_exchange_rate_to_payments.sql

-- Add exchange_rate column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4);

-- Comment to explain
COMMENT ON COLUMN public.payments.exchange_rate IS 'Exchange rate (VES/USD) at the moment of payment registration';
