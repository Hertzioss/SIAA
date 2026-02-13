-- Add indexes to payments table to fix slow queries and timeouts
-- Specifically for the "Conciliación de Pagos" page which orders by date DESC
-- 1. Index on date (Critical for sorting)
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(date);
-- 2. Indexes on Foreign Keys (Good practice for joins)
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
-- 3. Notify completion
DO $$ BEGIN RAISE NOTICE 'Indexes created successfully on public.payments';
END $$;