-- Fix payments foreign key to cascade delete when a contract is deleted
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_contract_id_fkey;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_contract_id_fkey 
FOREIGN KEY (contract_id) 
REFERENCES public.contracts(id) 
ON DELETE CASCADE;
