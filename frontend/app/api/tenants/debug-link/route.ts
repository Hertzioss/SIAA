import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/tenants/debug-link
 * Diagnostic endpoint: given an email, shows what auth user and tenant records exist
 * to identify mismatches.
 */
export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

        const emailLower = email.toLowerCase().trim()

        // 1. Find auth user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const authUser = users.find(u => u.email?.toLowerCase() === emailLower)

        // 2. Find tenant by email
        const { data: tenantByEmail } = await supabaseAdmin
            .from('tenants')
            .select('id, name, email, user_id')
            .ilike('email', emailLower)
            .maybeSingle()

        // 3. If auth user exists, find tenant by user_id
        let tenantByUserId = null
        if (authUser) {
            const { data } = await supabaseAdmin
                .from('tenants')
                .select('id, name, email, user_id')
                .eq('user_id', authUser.id)
                .maybeSingle()
            tenantByUserId = data
        }

        return NextResponse.json({
            query: { email: emailLower },
            authUser: authUser ? {
                id: authUser.id,
                email: authUser.email,
                metadata: authUser.user_metadata,
            } : null,
            tenantByEmail,
            tenantByUserId,
            diagnosis: !authUser
                ? 'No auth user found with this email. Run Sincronizar Accesos or create-user first.'
                : !tenantByEmail
                    ? 'Auth user exists but no tenant has this email in the DB.'
                    : tenantByEmail.user_id === authUser.id
                        ? 'Correctly linked ✓'
                        : `MISMATCH: tenant has user_id=${tenantByEmail.user_id || 'null'} but auth user id=${authUser.id}. Sync needed.`
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
