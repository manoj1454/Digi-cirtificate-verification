const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment variables
const frontendEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, 'frontend/.env')));
const backendEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, 'backend/.env')));

const supabaseUrl = frontendEnv.VITE_SUPABASE_URL || backendEnv.SUPABASE_URL;
const anonKey = frontendEnv.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = backendEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase URL or Anon Key in frontend/.env');
  process.exit(1);
}

// Clients
const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STUDENT_EMAIL = 'student@gmail.com';
const STUDENT_PASSWORD = 'password' === '123456' ? 'password' : '123456';

async function setupTestDataIfEmpty(studentUserId) {
  // Check if institution exists
  let { data: institutions } = await adminClient.from('institutions').select('*');
  let instId;
  if (!institutions || institutions.length === 0) {
    const { data: newInst } = await adminClient.from('institutions').insert({
      name: 'NGIT Tech University',
      registration_number: 'REG-TEST-001',
      status: 'approved',
    }).select().single();
    instId = newInst.id;
  } else {
    instId = institutions[0].id;
  }

  // Check if student profile exists for this student
  let { data: studentRecord } = await adminClient
    .from('students')
    .select('*')
    .eq('user_id', studentUserId)
    .maybeSingle();

  if (!studentRecord) {
    const { data: newStudent, error: sErr } = await adminClient
      .from('students')
      .insert({
        user_id: studentUserId,
        institution_id: instId,
        roll_number: 'ROLL-STUDENT-001',
        full_name: 'Test Student',
      })
      .select()
      .single();
    if (sErr) {
      console.warn('Could not auto-create student record:', sErr.message);
    } else {
      studentRecord = newStudent;
    }
  }

  // Ensure there is at least one certificate for this student
  if (studentRecord) {
    const { data: certs } = await adminClient
      .from('certificates')
      .select('*')
      .eq('student_id', studentRecord.id);

    if (!certs || certs.length === 0) {
      await adminClient.from('certificates').insert({
        credential_id: 'CRED-TEST-STUDENT-001',
        student_id: studentRecord.id,
        institution_id: instId,
        degree_name: 'B.S. in Computer Science',
        issue_date: '2025-06-15',
        revoked: false,
      });
    }
  }

  // Also ensure there is a certificate for another entity to test isolation
  const { data: otherCerts } = await adminClient
    .from('certificates')
    .select('*')
    .neq('student_id', studentRecord?.id || '00000000-0000-0000-0000-000000000000');

  if (!otherCerts || otherCerts.length === 0) {
    // Create dummy student record for another user/entity
    let dummyUserId = '41b500f3-6825-4b6d-80b8-ec0e9cc51717'; // regulator or dummy
    let { data: otherStudent } = await adminClient
      .from('students')
      .select('*')
      .eq('user_id', dummyUserId)
      .maybeSingle();

    if (!otherStudent) {
      const res = await adminClient.from('students').insert({
        user_id: dummyUserId,
        institution_id: instId,
        roll_number: 'ROLL-OTHER-999',
        full_name: 'Other Student',
      }).select().maybeSingle();
      otherStudent = res.data;
    }

    if (otherStudent) {
      await adminClient.from('certificates').insert({
        credential_id: 'CRED-OTHER-STUDENT-999',
        student_id: otherStudent.id,
        institution_id: instId,
        degree_name: 'M.S. in Cryptography',
        issue_date: '2025-07-20',
        revoked: false,
      });
    }
  }

  return studentRecord;
}

async function runTest() {
  console.log('================================================================');
  console.log('   ROW-LEVEL SECURITY (RLS) TEST FOR STUDENT ROLE');
  console.log('================================================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Target User : ${STUDENT_EMAIL}`);
  console.log(`Client Key  : Anon Key (Public Client)\n`);

  // Step 1: Sign in with the test student account
  console.log('[STEP 1] Authenticating via supabase.auth.signInWithPassword()...');
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('FAIL: Authentication failed for student account.');
    console.error('Raw Auth Error:', authError);
    process.exit(1);
  }

  const authenticatedUser = authData.user;
  console.log(`SUCCESS: Authenticated as ${authenticatedUser.email} (User UID: ${authenticatedUser.id})\n`);

  // Setup test data in DB if not already present
  const studentRecord = await setupTestDataIfEmpty(authenticatedUser.id);
  const studentDbId = studentRecord?.id;
  console.log(`Student Record ID in public.students: ${studentDbId || 'N/A'}\n`);

  // Create an authenticated client scoped to the student's access token
  const studentClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });

  // Step 2: Attempt to SELECT * from certificates table with NO FILTER
  console.log('[STEP 2] Querying certificates table: SELECT * from certificates (NO FILTER)...');
  const { data: certRows, error: certError } = await studentClient
    .from('certificates')
    .select('*');

  console.log('Raw certificates response:');
  console.log(JSON.stringify({ data: certRows, error: certError }, null, 2));

  let certCheckPassed = false;
  if (certError) {
    console.log(`Certificates query returned an error: ${certError.message}`);
  } else {
    console.log(`Rows returned from certificates: ${certRows.length}`);
    const foreignRows = certRows.filter(r => r.student_id !== studentDbId);
    if (foreignRows.length > 0) {
      console.error(`SECURITY LEAK: Student received ${foreignRows.length} certificate(s) belonging to other students!`);
      console.error(foreignRows);
      certCheckPassed = false;
    } else {
      console.log(`CONFIRMED: All ${certRows.length} returned certificate row(s) belong strictly to this student (student_id = ${studentDbId}). No other student data was leaked.`);
      certCheckPassed = true;
    }
  }
  console.log('');

  // Step 3: Attempt to SELECT * from institutions table with NO FILTER
  console.log('[STEP 3] Querying institutions table: SELECT * from institutions (NO FILTER)...');
  const { data: instRows, error: instError } = await studentClient
    .from('institutions')
    .select('*');

  console.log('Raw institutions response:');
  console.log(JSON.stringify({ data: instRows, error: instError }, null, 2));

  let instCheckPassed = false;
  if (instError) {
    console.log(`CONFIRMED: Access denied by RLS/PostgreSQL policy: ${instError.message}`);
    instCheckPassed = true;
  } else if (instRows && instRows.length === 0) {
    console.log('CONFIRMED: 0 rows returned. Even though institutions exist in the table, RLS completely blocks visibility for students.');
    instCheckPassed = true;
  } else {
    console.error(`SECURITY LEAK: Student was able to view ${instRows.length} institution records!`);
    console.error(instRows);
    instCheckPassed = false;
  }
  console.log('');

  // Step 4: Summary
  console.log('================================================================');
  console.log('   TEST SUMMARY');
  console.log('================================================================');
  console.log(`1. Certificate Isolation Check: ${certCheckPassed ? 'PASS' : 'FAIL'}`);
  console.log(`2. Institution Protection Check: ${instCheckPassed ? 'PASS' : 'FAIL'}`);

  const overallPass = certCheckPassed && instCheckPassed;
  console.log(`\nOVERALL RESULT: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log(
    overallPass
      ? 'Student only ever sees their own certificate data and cannot read the institutions table at all.'
      : 'Row-Level Security policy check failed.'
  );
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Unexpected test failure:', err);
  process.exit(1);
});
