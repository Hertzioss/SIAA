-- Add user_id column to tenants table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'user_id') THEN
        ALTER TABLE public.tenants ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
