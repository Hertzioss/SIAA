import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { User } from '@supabase/supabase-js'

export type TrustedRole = 'admin' | 'operator' | 'tenant' | 'owner'

export interface VerifiedAdmin {
    user: User
    role: 'admin' | 'operator'
}

const ADMIN_ROLES = new Set<string>(['admin', 'operator'])

function getSuperAdminEmail(): string | null {
    const email =
        process.env.SUPER_ADMIN_EMAIL ||
        process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
        ''
    return email.trim().toLowerCase() || null
}

/**
 * Resuelve el rol confiable de un usuario desde fuentes del servidor:
 * 1. SUPER_ADMIN_EMAIL (variable de entorno)
 * 2. user.app_metadata.role (solo editable por service_role)
 * 3. public.users.role (protegida por RLS sin UPDATE para usuarios regulares)
 * 4. Compatibilidad con admins/operadores creados antes de sincronizar public.users:
 *    - Primero verifica en `tenants` y `owners` (por user_id y email) para impedir
 *      que un inquilino o propietario pueda escalar privilegios alterando user_metadata.
 *    - Solo si NO pertenece a `tenants` ni `owners`, acepta `user_metadata.role`
 *      cuando sea 'admin' u 'operator'.
 */
async function resolveTrustedRole(user: User): Promise<string | null> {
    const superAdminEmail = getSuperAdminEmail()
    if (superAdminEmail && user.email?.toLowerCase() === superAdminEmail) {
        return 'admin'
    }

    const appMetaRole = user.app_metadata?.role
    if (typeof appMetaRole === 'string' && appMetaRole.trim()) {
        return appMetaRole.trim().toLowerCase()
    }

    const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (dbUser?.role && typeof dbUser.role === 'string') {
        return dbUser.role.trim().toLowerCase()
    }

    // Legacy fallback: verify the user is NOT a tenant or owner before checking user_metadata
    const userEmail = user.email?.trim().toLowerCase()
    const [tenantByUid, ownerByUid] = await Promise.all([
        supabaseAdmin.from('tenants').select('id').eq('user_id', user.id).maybeSingle(),
        supabaseAdmin.from('owners').select('id').eq('user_id', user.id).maybeSingle(),
    ])

    if (tenantByUid.data) return 'tenant'
    if (ownerByUid.data) return 'owner'

    if (userEmail) {
        const [tenantByEmail, ownerByEmail] = await Promise.all([
            supabaseAdmin.from('tenants').select('id').ilike('email', userEmail).maybeSingle(),
            supabaseAdmin.from('owners').select('id').ilike('email', userEmail).maybeSingle(),
        ])
        if (tenantByEmail.data) return 'tenant'
        if (ownerByEmail.data) return 'owner'
    }

    const legacyMetaRole = user.user_metadata?.role
    if (typeof legacyMetaRole === 'string' && ADMIN_ROLES.has(legacyMetaRole.trim().toLowerCase())) {
        return legacyMetaRole.trim().toLowerCase()
    }

    return null
}

/**
 * Verifica un JWT de Supabase y garantiza que pertenece a un admin u operador.
 */
export async function verifyAdminToken(
    accessToken: string | null | undefined
): Promise<{ ok: true; data: VerifiedAdmin } | { ok: false; status: 401 | 403; error: string }> {
    const token = accessToken?.trim()
    if (!token) {
        return { ok: false, status: 401, error: 'No autorizado: sesión requerida' }
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) {
        return { ok: false, status: 401, error: 'Sesión inválida o expirada' }
    }

    const role = await resolveTrustedRole(data.user)
    if (!role || !ADMIN_ROLES.has(role)) {
        return {
            ok: false,
            status: 403,
            error: 'Acceso denegado: se requieren permisos de administrador',
        }
    }

    return {
        ok: true,
        data: {
            user: data.user,
            role: role as 'admin' | 'operator',
        },
    }
}

/**
 * Guardia para Route Handlers (`/api/*`).
 * Lee el encabezado `Authorization: Bearer <token>`.
 */
export async function requireAdminRequest(
    request: Request
): Promise<{ ok: true; data: VerifiedAdmin } | { ok: false; response: NextResponse }> {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    const result = await verifyAdminToken(token)
    if (!result.ok) {
        return {
            ok: false,
            response: NextResponse.json({ error: result.error }, { status: result.status }),
        }
    }

    return { ok: true, data: result.data }
}

/**
 * Guardia para Server Actions administrativas (`actions/*`).
 */
export async function requireAdminAction(
    accessToken: string | null | undefined
): Promise<{ ok: true; data: VerifiedAdmin } | { ok: false; error: string }> {
    const result = await verifyAdminToken(accessToken)
    if (!result.ok) {
        return { ok: false, error: result.error }
    }
    return { ok: true, data: result.data }
}
