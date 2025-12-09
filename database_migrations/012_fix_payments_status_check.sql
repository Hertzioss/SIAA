-- Fix payments status check constraint to include 'approved' and 'rejected'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'overdue'));
