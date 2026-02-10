
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});


async function testFullQuery() {
    console.log('Testing FULL query (combined)...');
    const { data, error } = await supabase
        .from('owners')
        .select(`
          *,
          logo_url,
          beneficiaries:owner_beneficiaries(*),
          property_owners(
            property:properties(
              id,
              name,
              address
            )
          )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Full query failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('Full query SUCCESS. Count:', data.length);
    }
}

async function run() {
    await testFullQuery();
}

run();
