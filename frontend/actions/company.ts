'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export async function getCompany() {
    try {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .single()
        
        if (error && error.code !== 'PGRST116') {
             throw error
        }

        return { success: true, data }
    } catch (error: any) {
        console.error("Error fetching company:", error)
        return { success: false, error: error.message }
    }
}

export async function updateCompany(data: {
    name: string
    rif: string
    address: string
    phone: string
    email: string
    logo_url?: string | null
}) {
    try {
        // Check if company exists
        const { data: existing } = await supabaseAdmin
            .from('companies')
            .select('id')
            .single()

        let error
        
        if (existing) {
             const result = await supabaseAdmin
                .from('companies')
                .update(data)
                .eq('id', existing.id)
             error = result.error
        } else {
             const result = await supabaseAdmin
                .from('companies')
                .insert(data)
             error = result.error
        }

        if (error) throw error

        revalidatePath('/account')
        return { success: true }
    } catch (error: any) {
        console.error("Error updating company:", error)
        return { success: false, error: error.message }
    }
}
