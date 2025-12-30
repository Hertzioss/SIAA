-- FIX RLS NOTIFICATIONS
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar política actual (solo lectura) para recrearla completa
DROP POLICY IF EXISTS "Admins view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;

-- 2. Crear nueva política que permita TODO (Select, Insert, Update, Delete)
-- Esta es una política simplificada para administradores/operadores autenticados.
CREATE POLICY "Admins manage notifications" ON public.notifications
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Esto habilita:
-- SELECT: Si 'authenticated' (USING)
-- INSERT: Si 'authenticated' (WITH CHECK)
-- UPDATE: Si 'authenticated' (USING & WITH CHECK)
-- DELETE: Si 'authenticated' (USING)
