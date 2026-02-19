-- Migration: Add missing columns to payments table for historical preservation and billing support
-- Date: 2026-02-18
-- 1. Add metadata column for historical snapshots (denormalization)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- 2. Add billing_period column for monthly reconciliation tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS billing_period DATE;
-- 3. Add comment for clarity
COMMENT ON COLUMN public.payments.metadata IS 'Stores historical snapshots of tenant/contract data at time of payment';
COMMENT ON COLUMN public.payments.billing_period IS 'The specific month/period this payment applies to (usually first day of month)';