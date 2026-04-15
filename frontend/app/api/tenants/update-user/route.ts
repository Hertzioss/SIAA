import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, email, name } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const updateData: any = {}

        if (email) updateData.email = email
        if (name) updateData.user_metadata = { full_name: name }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: true, message: 'Nothing to update' })
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updateData
        )

        if (error) {
            console.error('Error updating auth user:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Also update the public.users table if name changed
        if (name) {
            await supabaseAdmin.from('users').update({ full_name: name }).eq('id', userId)
        }
        
        // Also update standard public.users email just in case if the table defines it
        if (email) {
            await supabaseAdmin.from('users').update({ email: email }).eq('id', userId)
        }

        return NextResponse.json({ success: true, data })

    } catch (error: any) {
        console.error('Server error updating user:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
