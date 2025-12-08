-- 004_restrict_notifications.sql

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;

-- Create policy for Admins/Operators (Full Access)
-- Assuming 'users' table has 'role' and is linked to auth.users
CREATE POLICY "Admins/Operators manage all notifications" ON public.notifications
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'operator')
    )
);

-- Create policy for Tenants (Read Own Only)
-- Tenants can see notifications where tenant_id matches their RECORD in 'tenants' table
-- We need to link auth.uid() -> tenants.user_id -> tenants.id -> notifications.tenant_id
CREATE POLICY "Tenants view own notifications" ON public.notifications
FOR SELECT
USING (
    tenant_id IN (
        SELECT id FROM public.tenants 
        WHERE user_id = auth.uid()
    )
);
