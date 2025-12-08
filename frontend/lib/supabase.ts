import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://desarrollo-siaa-db.jnvzha.easypanel.host"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""


if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ Using default hardcoded Supabase URL. Ensure .env is configured correctly for Realtime/WSS.');
}

export const supabase = createClient(supabaseUrl, supabaseKey)