
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function main() {
    const email = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin@admin.com'
    const password = 'SuperAdmin123!'

    console.log(`Creating user ${email}...`)

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: 'Super Admin' }
    })

    if (error) {
        console.error('Error creating user:', error.message)
    } else {
        console.log('User created successfully.')
        console.log('ID:', data.user.id)
        console.log('Email:', data.user.email)
        console.log('Password:', password)
    }
}

main()
