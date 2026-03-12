import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generatePassword } from '@/lib/utils-password'
import { sendEmail as sendEmailFn } from '@/lib/mail'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, name, tenantId, sendEmail = true } = body

        if (!email || !name || !tenantId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const password = generatePassword()

        // 1. Check if a user with this email already exists
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) throw listError

        const existingUser = existingUsers.users.find(u => u.email === email)

        let authUserId: string

        if (existingUser) {
            // User already exists (e.g., previously linked tenant) — reuse their ID
            // Update their metadata to point to this tenant
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                user_metadata: { full_name: name, role: 'tenant', tenant_id: tenantId }
            })
            authUserId = existingUser.id
        } else {
            // 2. Create new Auth User
            const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name, role: 'tenant', tenant_id: tenantId }
            })

            if (authError) {
                console.error('Error creating auth user:', authError)
                return NextResponse.json(
                    { error: 'Failed to create user', details: authError.message },
                    { status: 500 }
                )
            }

            if (!user?.user) {
                return NextResponse.json({ error: 'User creation returned no data' }, { status: 500 })
            }

            authUserId = user.user.id
        }

        // 3. Update Tenant Record with User ID - always ensure correct link
        const { error: updateError } = await supabaseAdmin
            .from('tenants')
            .update({ user_id: authUserId })
            .eq('id', tenantId)

        if (updateError) {
            console.error('Error updating tenant user_id:', updateError)
        }

        // 4. Send Welcome Email (only if explicitly requested)
        if (sendEmail) {
            const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://escritorio.legal'
            await sendEmailFn({
                to: email,
                subject: 'Bienvenido a Escritorio Legal - Tus Credenciales de Acceso',
                html: `
                <h1>Bienvenido ${name}</h1>
                <p>Se ha creado tu cuenta de acceso al portal de inquilinos.</p>
                <p>Estas son tus credenciales:</p>
                <ul>
                    <li><strong>Usuario/Email:</strong> ${email}</li>
                    <li><strong>Contraseña:</strong> ${password}</li>
                </ul>
                <p>Puedes iniciar sesión aquí: <a href="${loginUrl}">${loginUrl}</a></p>
                <p>Te recomendamos cambiar tu contraseña al entrar.</p>
                `
            })
        }

        return NextResponse.json({ success: true, userId: authUserId })

    } catch (error: any) {
        console.error('API Error creating tenant user:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
