import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generatePassword } from '@/lib/utils-password'
import { sendEmail } from '@/lib/mail'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId, email } = body

        if (!tenantId || !email) {
            return NextResponse.json(
                { error: 'Missing tenantId or email' },
                { status: 400 }
            )
        }

        // 1. Find the User by Metadata (tenant_id) or Email
        // Since we link via specific logic, let's try finding by email first as it's unique
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) throw listError

        // Find user with matching tenant_id OR email
        const user = users.find(u => u.email === email || u.user_metadata.tenant_id === tenantId)

        if (!user) {
            return NextResponse.json(
                { error: 'User not found for this tenant' },
                { status: 404 }
            )
        }

        const { password: providedPassword } = body

        // ... find user ...

        // 2. Generate New Password or Use Provided
        const newPassword = providedPassword || generatePassword()

        // 3. Update User Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        )

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update password', details: updateError.message },
                { status: 500 }
            )
        }

        // 4. Send Email
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await sendEmail({
            to: email,
            subject: 'Restablecimiento de Contraseña - Escritorio Legal',
            html: `
            <h1>${providedPassword ? 'Sus Credenciales han sido Actualizadas' : 'Nuevas Credenciales de Acceso'}</h1>
            <p>Hola,</p>
            <p>${providedPassword ? 'El administrador ha establecido una nueva contraseña para su cuenta.' : 'Se ha solicitado un restablecimiento de sus credenciales.'}</p>
            <ul>
                <li><strong>Usuario:</strong> ${email}</li>
                <li><strong>Contraseña:</strong> ${newPassword}</li>
            </ul>
            <p>Ingresa aquí: <a href="${loginUrl}">${loginUrl}</a></p>
            `
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('API Error resetting password:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
