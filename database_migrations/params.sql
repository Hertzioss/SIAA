-- =============================================================================
-- Parámetros del Sistema
-- Última actualización: 2026-04-23
-- Contiene: usuario administrador inicial.
-- Ejecutar DESPUÉS de schema.sql y seed.sql en una instancia nueva.
--
-- ⚠️  IMPORTANTE: Cambia la contraseña antes de ejecutar en producción.
-- =============================================================================


-- =============================================================================
-- 1. USUARIO ADMINISTRADOR INICIAL
-- Contraseña por defecto: Admin2024!
-- El trigger on_auth_user_created crea automáticamente el registro en public.users
-- =============================================================================
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
SELECT
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'admin@siaa.com',
    crypt('Admin2024!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Principal","role":"admin"}',
    now(),
    now(),
    '', '', '', ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@siaa.com'
);

-- =============================================================================
-- 2. SINCRONIZAR USUARIOS EXISTENTES
-- Asegura que todos los usuarios en auth.users tengan registro en public.users.
-- Útil si el trigger no se ejecutó en registros previos.
-- =============================================================================
INSERT INTO public.users (id, email, full_name, role)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(raw_user_meta_data->>'role', 'admin')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
