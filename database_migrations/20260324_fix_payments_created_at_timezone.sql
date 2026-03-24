-- Migration to fix registration time offset across all initial tables
-- Changes created_at from TIMESTAMP to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
-- This allows Supabase to return ISO strings with offset, enabling correct local time display in the frontend.

-- 1. Payments
ALTER TABLE public.payments ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.payments ALTER COLUMN created_at SET DEFAULT NOW();

-- 2. Users
ALTER TABLE public.users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT NOW();

-- 3. Properties
ALTER TABLE public.properties ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.properties ALTER COLUMN created_at SET DEFAULT NOW();

-- 4. Units
ALTER TABLE public.units ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.units ALTER COLUMN created_at SET DEFAULT NOW();

-- 5. Tenants
ALTER TABLE public.tenants ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.tenants ALTER COLUMN created_at SET DEFAULT NOW();

-- 6. Contracts
ALTER TABLE public.contracts ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.contracts ALTER COLUMN created_at SET DEFAULT NOW();

-- 7. Notifications
ALTER TABLE public.notifications ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.notifications ALTER COLUMN created_at SET DEFAULT NOW();

-- 8. Notification Templates
ALTER TABLE public.notification_templates ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE public.notification_templates ALTER COLUMN created_at SET DEFAULT NOW();
