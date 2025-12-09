-- 014_allow_indefinite_contracts.sql
-- Allow contracts to have no end date (indefinite term)

ALTER TABLE public.contracts ALTER COLUMN end_date DROP NOT NULL;
