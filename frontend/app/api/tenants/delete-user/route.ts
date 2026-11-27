import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminRequest } from '@/lib/server-auth'

export async function POST(request: Request) {
    try {
        const auth = await requireAdminRequest(request)
        if (!auth.ok) return auth.response

        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required fields: userId' },
                { status: 400 }
            )
        }

        if (userId === auth.data.user.id) {
            return NextResponse.json(
                { error: 'No puedes eliminar tu propia cuenta de usuario' },
                { status: 400 }
            )
        }

        // Delete Auth User
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Error deleting auth user:', error)
            return NextResponse.json(
                { error: 'Failed to delete user', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('API Error deleting tenant user:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
