const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('Testing Supabase Admin connection...');
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 10 });
  if (userErr) {
    console.error('Error listing users:', userErr);
    process.exit(1);
  }
  console.log(`Successfully connected. Found ${users.length} users in Supabase Auth.`);
}

main();
