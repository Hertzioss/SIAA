'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { requireAdminAction } from "@/lib/server-auth"
import { generatePassword } from "@/lib/utils-password"

export async function getUsers(accessToken: string) {
    try {
        const auth = await requireAdminAction(accessToken)
        if (!auth.ok) return { success: false, error: auth.error }

        // Fetch users from Auth API to get last_sign_in_at and metadata
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 // Reasonable limit for now
        })

        if (error) throw error

        // Map Auth User to our User type
        const mappedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'Sin Nombre',
            role: u.app_metadata?.role || u.user_metadata?.role || 'user',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at
        }))

        return { success: true, data: mappedUsers }
    } catch (error: any) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getUnlinkedTenants(accessToken: string) {
    try {
        const auth = await requireAdminAction(accessToken)
        if (!auth.ok) return { success: false, error: auth.error }

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

export async function createUser(
    accessToken: string,
    data: { email: string; fullName: string; role: 'admin' | 'operator' | 'tenant'; password?: string; tenantId?: string }
) {
    try {
        const auth = await requireAdminAction(accessToken)
        if (!auth.ok) return { success: false, error: auth.error }

        const { email, fullName, role, password, tenantId } = data

        // 1. Create in Auth (Admin API) with cryptographically secure fallback password and server-trusted app_metadata
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password?.trim() || generatePassword(14),
            email_confirm: true,
            app_metadata: {
                role: role,
                tenant_id: tenantId,
            },
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

export async function updateUser(
    accessToken: string,
    userId: string,
    data: { role: 'admin' | 'operator' | 'tenant'; password?: string }
) {
    try {
        const auth = await requireAdminAction(accessToken)
        if (!auth.ok) return { success: false, error: auth.error }

        const { role, password } = data

        // 1. Update public table
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .update({ role })
            .eq('id', userId)

        if (publicError) throw publicError

        // 2. Update Auth app_metadata, user_metadata and password if requested
        const updateData: {
            app_metadata: { role: string }
            user_metadata: { role: string }
            password?: string
        } = {
            app_metadata: { role: role },
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

export async function deleteUser(accessToken: string, userId: string) {
    try {
        const auth = await requireAdminAction(accessToken)
        if (!auth.ok) return { success: false, error: auth.error }

        if (userId === auth.data.user.id) {
            return { success: false, error: 'No puedes eliminar tu propia cuenta de administrador' }
        }

        // Unlink tenant from this user (set user_id to null)
        const { error: unlinkError } = await supabaseAdmin
            .from('tenants')
            .update({ user_id: null })
            .eq('user_id', userId)

        if (unlinkError) {
            console.error('Error unlinking tenant from user:', unlinkError)
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
