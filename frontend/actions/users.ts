'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export async function getUsers() {
    try {
        // 1. Get all profiles from public table
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (profilesError) throw profilesError

        // 2. Get auth data to mix in (optional, but good for checking last sign in etc if needed)
        // For now we just return profiles since that has the role
        return { success: true, data: profiles }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getUnlinkedTenants() {
    try {
        const { data, error } = await supabaseAdmin
            .from('tenants')
            .select('id, name, doc_id')
            .is('user_id', null)
            .order('name')

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching unlinked tenants:', error)
        return { success: false, error: error.message }
    }
}

export async function createUser(data: { email: string; fullName: string; role: 'admin' | 'operator' | 'tenant'; password?: string; tenantId?: string }) {
    try {
        const { email, fullName, role, password, tenantId } = data

        // 1. Create in Auth (Admin API)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password || 'TempPassword123!', // Default password calls for a robust flow, but this is a starter
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role,
                tenant_id: tenantId // Store the link in metadata too
            }
        })

        if (authError) throw authError

        // 2. The trigger `on_auth_user_created` should handle the public.users insertion.

        // 3. If tenantId is provided, link the tenant to this new user
        if (tenantId && authUser.user) {
            const { error: linkError } = await supabaseAdmin
                .from('tenants')
                .update({ user_id: authUser.user.id })
                .eq('id', tenantId)

            if (linkError) {
                console.error('Error linking tenant to user:', linkError)
                // We don't rollback the user creation here, but we should probably report it
            }
        }

        // Revalidate the users page
        revalidatePath('/users')

        return { success: true, data: authUser }
    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, error: error.message || 'Failed to create user' }
    }
}

export async function updateUser(userId: string, data: { role: 'admin' | 'operator' | 'tenant'; password?: string }) {
    try {
        const { role, password } = data

        // 1. Update public table
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .update({ role })
            .eq('id', userId)

        if (publicError) throw publicError

        // 2. Update Auth metadata and password if requested
        const updateData: any = {
            user_metadata: { role: role }
        }

        if (password && password.trim() !== '') {
            updateData.password = password
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updateData
        )

        if (authError) throw authError

        revalidatePath('/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating user:', error)
        return { success: false, error: error.message || 'Failed to update user' }
    }
}

export async function deleteUser(userId: string) {
    try {
        // 0. Check if this user is a tenant
        // If so, we MUST NOT delete the tenant data or history, only unlink the user account.

        // Unlink tenant from this user (set user_id to null)
        const { error: unlinkError } = await supabaseAdmin
            .from('tenants')
            .update({ user_id: null })
            .eq('user_id', userId)

        if (unlinkError) {
            console.error('Error unlinking tenant from user:', unlinkError)
            // We might want to throw here if strict consistency is required, 
            // but often we want to proceed with user deletion even if unlinking "fails" (e.g. if no rows matched)
        }

        // 1. Delete from Auth (Cascades to public.users via DB constraint)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) throw error

        revalidatePath('/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting user:', error)
        return { success: false, error: error.message || 'Failed to delete user' }
    }
}
