import { createClient } from '@supabase/supabase-js'

// Note: This must only be used on the server-side!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Internal Supabase Credentials (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL)")
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
