'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/mail"
import { generateOwnerCredentialsTemplate } from "@/lib/email-templates"

/**
 * Creates an auth user for an existing owner and links them.
 */
export async function enableOwnerAccess(ownerId: string, email: string, password?: string) {
    try {
        // 1. Get Owner to verify existence
        const { data: owner, error: ownerError } = await supabaseAdmin
            .from('owners')
            .select('*')
            .eq('id', ownerId)
            .single()

        if (ownerError || !owner) throw new Error("Propietario no encontrado")

        if (owner.user_id) {
            return { success: false, error: "El propietario ya tiene acceso habilitado" }
        }

        // 2. Create Auth User
        // Use provided password or generate a random one (though for UX provided is better)
        const finalPassword = password || Math.random().toString(36).slice(-10) + "Aa1!"

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: finalPassword,
            email_confirm: true,
            user_metadata: {
                full_name: owner.name,
                role: 'owner',
                owner_id: ownerId
            }
        })

        if (authError) throw authError

        if (!authUser.user) throw new Error("No se pudo crear el usuario")

        // 3. Link Owner to User
        const { error: linkError } = await supabaseAdmin
            .from('owners')
            .update({ user_id: authUser.user.id })
            .eq('id', ownerId)

        if (linkError) {
            // Rollback auth user? 
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            throw new Error("Error vinculando propietario: " + linkError.message)
        }

        // 4. Send Email
        try {
            await sendEmail({
                to: email,
                subject: 'Bienvenido al Portal de Propietarios',
                html: generateOwnerCredentialsTemplate(owner.name, email, finalPassword, false)
            })
        } catch (emailError) {
            console.error("Error sending welcome email:", emailError)
            // We don't fail the whole request since the user was created. User can view password in UI.
        }

        revalidatePath('/owners')
        return { success: true, data: { user: authUser.user, password: finalPassword } }

    } catch (error: unknown) {
        console.error("Error enabling owner access:", error)
        const message = error instanceof Error ? error.message : "Error desconocido enabling owner access"
        return { success: false, error: message }
    }
}

/**
 * Disable owner access (unlink and delete user)
 */
export async function disableOwnerAccess(ownerId: string) {
    try {
        // 1. Get Owner
        const { data: owner } = await supabaseAdmin
            .from('owners')
            .select('user_id')
            .eq('id', ownerId)
            .single()

        if (!owner?.user_id) return { success: false, error: "Este propietario no tiene acceso habilitado" }

        // 2. Unlink first
        await supabaseAdmin
            .from('owners')
            .update({ user_id: null })
            .eq('id', ownerId)

        // 3. Delete Auth User
        const { error } = await supabaseAdmin.auth.admin.deleteUser(owner.user_id)
        if (error) throw error

        revalidatePath('/owners')
        return { success: true }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido disabling owner access"
        return { success: false, error: message }
    }
}


/**
 * Resets the password for an owner's account.
 * Generates a new random password and returns it.
 */
export async function resetOwnerPassword(ownerId: string, password?: string) {
    try {
        const { data: owner } = await supabaseAdmin
            .from('owners')
            .select('user_id, email, name')
            .eq('id', ownerId)
            .single()

        if (!owner?.user_id) throw new Error("Acceso no habilitado para este propietario")

        // Update password
        const newPassword = password || Math.random().toString(36).slice(-10) + "Aa1!"

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            owner.user_id,
            { password: newPassword }
        )

        if (error) throw error

        // Send Email
        try {
            await sendEmail({
                to: owner.email,
                subject: 'Restablecimiento de Contraseña',
                html: generateOwnerCredentialsTemplate(owner.name, owner.email, newPassword, true)
            })
        } catch (emailError) {
            console.error("Error sending reset email:", emailError)
        }

        return { success: true, data: { password: newPassword, email: owner.email } }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido resetting owner password"
        return { success: false, error: message }
    }
}

/**
 * Updates an owner and syncs email with Auth User if applicable.
 * Also handles beneficiaries update (full replacement).
 */
export async function updateOwner(
    id: string,
    ownerData: {
        type: 'individual' | 'company'
        name: string
        doc_id: string
        email?: string | null
        phone?: string | null
        address?: string | null
        logo_url?: string | null
        beneficiaries?: { name: string; doc_id: string; participation_percentage: number }[]
    }
) {
    try {
        // 1. Get current owner to check for user_id and email changes
        const { data: currentOwner, error: fetchError } = await supabaseAdmin
            .from('owners')
            .select('user_id, email')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        // 2. Update Owner fields
        const { error: ownerError } = await supabaseAdmin
            .from('owners')
            .update({
                type: ownerData.type,
                name: ownerData.name,
                doc_id: ownerData.doc_id,
                email: ownerData.email,
                phone: ownerData.phone,
                address: ownerData.address,
                logo_url: ownerData.logo_url
            })
            .eq('id', id)

        if (ownerError) throw ownerError

        // 3. Handle Beneficiaries (Full Replacement)
        if (ownerData.beneficiaries) {
            // Delete existing
            const { error: delError } = await supabaseAdmin
                .from('owner_beneficiaries')
                .delete()
                .eq('owner_id', id)

            if (delError) throw delError

            // Insert new
            if (ownerData.beneficiaries.length > 0) {
                const beneficiariesToInsert = ownerData.beneficiaries.map(b => ({
                    owner_id: id,
                    name: b.name,
                    doc_id: b.doc_id,
                    participation_percentage: b.participation_percentage
                }))

                const { error: benError } = await supabaseAdmin
                    .from('owner_beneficiaries')
                    .insert(beneficiariesToInsert)

                if (benError) throw benError
            }
        }

        // 4. Sync Auth User Email if necessary
        if (currentOwner.user_id && ownerData.email && ownerData.email !== currentOwner.email) {
            // console.log(`Email changed from ${currentOwner.email} to ${ownerData.email}. Recreating user account...`)

            // A. Delete existing user
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(currentOwner.user_id)
            if (deleteError) {
                // console.error("Error deleting old auth user:", deleteError)
                throw new Error("Error eliminando cuenta de usuario anterior: " + deleteError.message)
            }

            // B. Create new user with new email
            const newPassword = Math.random().toString(36).slice(-10) + "Aa1!"
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: ownerData.email,
                password: newPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: ownerData.name,
                    role: 'owner',
                    owner_id: id
                }
            })

            if (createError) {
                console.error("Error creating new auth user:", createError)
                // Try to restore old user?? Complex. For now throw.
                throw new Error("Error creando nueva cuenta de usuario: " + createError.message)
            }

            if (!newUser.user) throw new Error("No se pudo crear el nuevo usuario")

            // C. Link new user to owner
            const { error: matchError } = await supabaseAdmin
                .from('owners')
                .update({ user_id: newUser.user.id }) // Email is already updated in step 2
                .eq('id', id)

            if (matchError) throw matchError

            // D. Send Welcome Email with new credentials
            try {
                await sendEmail({
                    to: ownerData.email,
                    subject: 'Credenciales de Acceso Actualizadas',
                    html: generateOwnerCredentialsTemplate(ownerData.name, ownerData.email, newPassword, false)
                })
            } catch (emailError) {
                console.error("Error sending new credentials email:", emailError)
            }
        }

        revalidatePath('/owners')
        return { success: true }

    } catch (error: unknown) {
        console.error("Error updating owner:", error)
        const message = error instanceof Error ? error.message : "Error desconocido updating owner"
        return { success: false, error: message }
    }
}
