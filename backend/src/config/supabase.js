const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let isConfigured = false;

if (
  supabaseUrl &&
  supabaseServiceRoleKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseUrl.includes('your-project')
) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    isConfigured = true;
  } catch (error) {
    console.error('Failed to initialize Supabase admin client:', error.message);
  }
} else {
  // Graceful fallback dummy/unconfigured instance to prevent server crash during early dev setup
  try {
    supabase = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceRoleKey || 'placeholder-service-role-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  } catch (err) {
    console.warn('Supabase credentials not configured in backend/.env');
  }
}

module.exports = {
  supabase,
  isConfigured,
  supabaseUrl,
};
