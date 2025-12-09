import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generatePassword } from '@/lib/utils-password'
import { sendEmail } from '@/lib/mail'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, name, tenantId } = body

        if (!email || !name || !tenantId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const password = generatePassword()

        // 1. Create Auth User
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

        // 2. Update Tenant Record with User ID (if column exists, otherwise skip/log)
        // Ideally we link them.
        if (user?.user) {
            await supabaseAdmin
                .from('tenants')
                .update({ user_id: user.user.id }) // Assuming user_id exists, based on typical schema
                .eq('id', tenantId)
        }

        // 3. Send Welcome Email
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://escritorio.legal'

        await sendEmail({
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

        return NextResponse.json({ success: true, userId: user?.user?.id })

    } catch (error: any) {
        console.error('API Error creating tenant user:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
