-- 010_fix_notifications_rls.sql

-- Helper function to check admin role securely (bypassing RLS on users table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Admins/Operators manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Tenants view own notifications" ON public.notifications;

-- Create robust Admin policy using the helper function
CREATE POLICY "Admins manage notifications" ON public.notifications 
FOR ALL 
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- Re-create Tenant policy
CREATE POLICY "Tenants view own notifications" ON public.notifications
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
  )
);
