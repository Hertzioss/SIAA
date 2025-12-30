-- FIX USERS ROLE CONSTRAINT
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar la restricción (constraint) actual que solo permite 'admin' y 'operator'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Crear la nueva restricción que incluye 'tenant'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'operator', 'tenant'));

-- 3. (Opcional) Modificar el trigger si fuera necesario, pero el actual usa el metadato, 
-- así que con cambiar la restricción de la tabla es suficiente.
