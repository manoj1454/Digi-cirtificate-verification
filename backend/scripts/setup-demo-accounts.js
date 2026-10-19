const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const demoPassword = process.env.DEMO_PASSWORD || process.env.VITE_DEMO_PASSWORD;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from backend/.env');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is missing from backend/.env');
  process.exit(1);
}

if (!demoPassword) {
  console.error('Error: DEMO_PASSWORD is not configured in backend/.env. Please set DEMO_PASSWORD before running this script.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const DEMO_ACCOUNTS = [
  {
    role: 'regulator',
    email: 'demo.regulator@xypher.demo',
    fullName: 'Dr. Evelyn Vance',
    meta: {
      role: 'regulator',
      fullName: 'Dr. Evelyn Vance',
    },
  },
  {
    role: 'institution',
    email: 'demo.institution@xypher.demo',
    fullName: 'Oxford Technical Institute Admin',
    institutionName: 'Oxford Technical Institute',
    registrationNumber: 'REG-DEMO-2026',
    meta: {
      role: 'institution',
      fullName: 'Oxford Technical Institute Admin',
      institutionName: 'Oxford Technical Institute',
      registrationNumber: 'REG-DEMO-2026',
    },
  },
  {
    role: 'student',
    email: 'demo.student@xypher.demo',
    fullName: 'Aarav Sharma',
    rollNumber: 'ROLL-2026-DEMO',
    meta: {
      role: 'student',
      fullName: 'Aarav Sharma',
      rollNumber: 'ROLL-2026-DEMO',
    },
  },
  {
    role: 'company',
    email: 'demo.company@xypher.demo',
    fullName: 'Vertex Capital HR Verifier',
    meta: {
      role: 'company',
      fullName: 'Vertex Capital HR Verifier',
    },
  },
];

async function setupDemoAccounts() {
  console.log('========================================================================');
  console.log('  XYPHER DEMO ACCOUNTS PROVISIONING (Supabase Auth + Neon DB)');
  console.log('========================================================================');

  const client = await pool.connect();
  let defaultInstId = null;

  try {
    for (const acc of DEMO_ACCOUNTS) {
      console.log(`\n--- Provisioning ${acc.role.toUpperCase()} Demo Account (${acc.email}) ---`);

      // 1. Check if user already exists in Supabase Auth
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      let authUser = listData?.users?.find((u) => u.email.toLowerCase() === acc.email.toLowerCase());

      if (authUser) {
        console.log(`Supabase Auth: Existing user found (ID: ${authUser.id}). Updating password and metadata...`);
        const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          {
            password: demoPassword,
            email_confirm: true,
            user_metadata: acc.meta,
          }
        );
        if (updateErr) throw updateErr;
        authUser = updated.user;
      } else {
        console.log('Supabase Auth: Creating new user with confirmed email...');
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: acc.email,
          password: demoPassword,
          email_confirm: true,
          user_metadata: acc.meta,
        });
        if (createErr) throw createErr;
        authUser = created.user;
        console.log(`Supabase Auth: Successfully created user ${acc.email} (ID: ${authUser.id})`);
      }

      // 2. Synchronize user record in Neon PostgreSQL users table
      await client.query(
        `INSERT INTO users (id, email, role, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           updated_at = NOW()`,
        [authUser.id, acc.email, acc.role, acc.fullName]
      );
      console.log(`Neon DB: Synced users table record for ${acc.email}`);

      // 3. Role-specific relational records in Neon
      if (acc.role === 'institution') {
        const instRes = await client.query(
          `INSERT INTO institutions (user_id, name, registration_number, status, approved_at)
           VALUES ($1, $2, $3, 'approved', NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             name = EXCLUDED.name,
             registration_number = EXCLUDED.registration_number,
             status = 'approved'
           RETURNING id`,
          [authUser.id, acc.institutionName, acc.registrationNumber]
        );
        defaultInstId = instRes.rows[0].id;

        // Update user.institution_id
        await client.query(`UPDATE users SET institution_id = $1 WHERE id = $2`, [
          defaultInstId,
          authUser.id,
        ]);

        // Add to institution_staff
        await client.query(
          `INSERT INTO institution_staff (institution_id, user_id, role)
           VALUES ($1, $2, 'admin')
           ON CONFLICT (institution_id, user_id) DO NOTHING`,
          [defaultInstId, authUser.id]
        );
        console.log(`Neon DB: Created/updated institution record '${acc.institutionName}' (ID: ${defaultInstId})`);
      } else if (acc.role === 'student') {
        // Resolve institution ID (use the demo institution or first available)
        let studentInstId = defaultInstId;
        if (!studentInstId) {
          const instLookup = await client.query(`SELECT id FROM institutions LIMIT 1`);
          if (instLookup.rows.length > 0) {
            studentInstId = instLookup.rows[0].id;
          }
        }

        if (studentInstId) {
          await client.query(
            `INSERT INTO students (user_id, institution_id, roll_number, full_name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               institution_id = EXCLUDED.institution_id,
               roll_number = EXCLUDED.roll_number,
               full_name = EXCLUDED.full_name`,
            [authUser.id, studentInstId, acc.rollNumber, acc.fullName]
          );
          console.log(`Neon DB: Created/updated student record '${acc.fullName}' with roll '${acc.rollNumber}'`);
        }
      }
    }

    console.log('\n========================================================================');
    console.log('  ALL 4 DEMO ACCOUNTS SUCCESSFULLY PROVISIONED!');
    console.log('========================================================================');
    console.log('1. Regulator:   demo.regulator@xypher.demo');
    console.log('2. Institution: demo.institution@xypher.demo');
    console.log('3. Student:     demo.student@xypher.demo');
    console.log('4. Company:     demo.company@xypher.demo');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Error provisioning demo accounts:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDemoAccounts();
