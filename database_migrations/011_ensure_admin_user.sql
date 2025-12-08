-- 011_ensure_admin_user.sql

-- 1. Sync users from auth.users that are missing in public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), 
    'admin'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 2. Update existing users to be admins (For development environment)
UPDATE public.users 
SET role = 'admin' 
WHERE role NOT IN ('admin', 'operator');

-- 3. Verify public.is_admin() function exists and is correct
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
