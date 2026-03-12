import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/tenants/sync-users
 * Matches every tenant (by email) to their auth user and updates user_id.
 * Safe to run multiple times.
 */
export async function POST() {
    try {
        // 1. Fetch all tenants that have an email
        const { data: tenants, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, email, user_id, name')
            .not('email', 'is', null)

        if (tenantError) throw tenantError
        if (!tenants?.length) {
            return NextResponse.json({ success: true, summary: { message: 'No tenants with email found' } })
        }

        // 2. Fetch all auth users
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        if (listError) throw listError

        // Build a lookup map: email (lowercase) -> auth user
        const authByEmail = new Map(users.map(u => [u.email?.toLowerCase(), u]))

        const results: { tenantName: string; email: string; status: string }[] = []

        for (const tenant of tenants) {
            const email = tenant.email?.toLowerCase()
            if (!email) {
                results.push({ tenantName: tenant.name, email: '', status: 'skipped - no email' })
                continue
            }

            const authUser = authByEmail.get(email)

            if (!authUser) {
                results.push({ tenantName: tenant.name, email, status: 'skipped - no auth account for this email' })
                continue
            }

            // Already correctly linked
            if (tenant.user_id === authUser.id) {
                results.push({ tenantName: tenant.name, email, status: 'already linked ✓' })
                continue
            }

            // Fix: update tenant's user_id
            const { error: updateError } = await supabaseAdmin
                .from('tenants')
                .update({ user_id: authUser.id })
                .eq('id', tenant.id)

            if (updateError) {
                results.push({ tenantName: tenant.name, email, status: `error: ${updateError.message}` })
            } else {
                // Also ensure auth metadata is correct
                await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                    user_metadata: {
                        ...authUser.user_metadata,
                        role: 'tenant',
                        tenant_id: tenant.id
                    }
                })
                results.push({ tenantName: tenant.name, email, status: 'fixed ✓' })
            }
        }

        const fixed = results.filter(r => r.status.startsWith('fixed')).length
        const alreadyOk = results.filter(r => r.status.startsWith('already')).length
        const skipped = results.filter(r => r.status.startsWith('skipped')).length
        const errors = results.filter(r => r.status.startsWith('error')).length

        return NextResponse.json({
            success: true,
            summary: { total: tenants.length, fixed, alreadyOk, skipped, errors },
            details: results
        })

    } catch (error: any) {
        console.error('Sync error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
