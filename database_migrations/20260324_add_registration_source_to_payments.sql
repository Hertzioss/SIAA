-- Actualizar registros existentes a 'admin'
UPDATE public.payments SET registration_source = 'admin' WHERE registration_source IS NULL OR registration_source = 'tenant';
