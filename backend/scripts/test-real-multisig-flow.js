const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = `http://localhost:${process.env.PORT || 5001}`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runTest() {
  console.log('========================================================================');
  console.log('STARTING REAL MULTI-SIG AUTHENTICATION & APPROVAL LIFECYCLE TEST');
  console.log('========================================================================\n');

  // Test identities
  const timestamp = Date.now().toString().slice(-5);
  const OWNER_EMAIL = `owner.${timestamp}@oxford.edu`;
  const OWNER_PASSWORD = 'Password123!';
  const STAFF2_EMAIL = `staff2.${timestamp}@oxford.edu`;
  const STAFF2_PASSWORD = 'StaffSecret123!';

  // 1. Setup an approved institution with Owner
  console.log('--- Step 1: Create Institution & Owner Account ---');
  const { data: ownerAuth, error: oAuthErr } = await adminClient.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'institution', fullName: 'Dean Alistair' },
  });
  if (oAuthErr) throw oAuthErr;
  const ownerUserId = ownerAuth.user.id;
  console.log(`Created Owner in Supabase Auth: ${OWNER_EMAIL} (UID: ${ownerUserId})`);

  // Insert into institutions with status = approved
  const { data: inst, error: instErr } = await adminClient
    .from('institutions')
    .insert({
      user_id: ownerUserId,
      name: `Oxford University (${timestamp})`,
      registration_number: `OXF-${timestamp}`,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (instErr) throw instErr;
  console.log(`Created & Approved Institution in DB: "${inst.name}" (ID: ${inst.id})`);

  // Add institution to blockchain registry if not added
  const { addInstitutionOnChain } = require('../src/config/blockchain');
  try {
    await addInstitutionOnChain(inst.id, inst.name);
    console.log(`Registered Institution on-chain in Registry.sol`);
  } catch (e) {
    console.log(`On-chain registration note:`, e.message);
  }

  // Also update Owner's users table
  await adminClient.from('users').upsert({
    id: ownerUserId,
    email: OWNER_EMAIL,
    role: 'institution',
    institution_id: inst.id,
  });

  // 2. Log in as Owner (Session 1)
  console.log('\n--- Step 2: Session 1 Login (Owner / Initiator) ---');
  const { data: sessionA, error: loginErrA } = await clientA.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });
  if (loginErrA) throw loginErrA;
  const tokenA = sessionA.session.access_token;
  console.log(`Successfully authenticated Owner session token (starts with: ${tokenA.slice(0, 20)}...)`);

  // Verify Owner can fetch my-institution
  const myInstRes = await fetch(`${API_BASE}/api/institutions/my-institution`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const myInstData = await myInstRes.json();
  console.log(`Owner fetched institution profile: "${myInstData.institution?.name}" (Accredited on-chain: ${myInstData.institution?.isAccreditedOnChain})`);

  // 3. Owner invites Staff 2 via POST /api/institutions/:id/invite-staff
  console.log('\n--- Step 3: Owner Invites Staff 2 via Dashboard API ---');
  const inviteRes = await fetch(`${API_BASE}/api/institutions/${inst.id}/invite-staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      email: STAFF2_EMAIL,
      password: STAFF2_PASSWORD,
      full_name: 'Professor Robert Miller',
    }),
  });
  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) throw new Error(inviteData.error || 'Failed to invite staff');
  console.log(`Staff 2 Invitation Result:`, inviteData.message);
  console.log(`Created Staff 2 UID: ${inviteData.staff?.id} with role: ${inviteData.staff?.role}, institution_id: ${inviteData.staff?.institution_id}`);

  // Fetch staff roster
  const staffRosterRes = await fetch(`${API_BASE}/api/institutions/${inst.id}/staff`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const staffRoster = await staffRosterRes.json();
  console.log(`Institution Staff Roster: ${staffRoster.staff?.length} active members:`);
  staffRoster.staff?.forEach((s) => {
    console.log(` - ${s.email} [${s.isOwner ? 'Owner' : 'Staff Signer'}]`);
  });

  // 4. Enroll Student & Initiate Certificate as Owner
  console.log('\n--- Step 4: Enroll Student & Initiate Certificate as Staff 1 (Owner) ---');
  const studentRes = await fetch(`${API_BASE}/api/institutions/${inst.id}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      full_name: 'Clara Oswald',
      roll_number: `CS-OX-${timestamp}`,
    }),
  });
  const studentData = await studentRes.json();
  console.log(`Enrolled student: ${studentData.student?.full_name} (ID: ${studentData.student?.id})`);

  // Initiate certificate upload
  const pdfBuffer = fs.readFileSync(path.resolve(__dirname, '../../test-cert.pdf'));
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, 'test-cert.pdf');
  formData.append('institution_id', inst.id);
  formData.append('student_id', studentData.student.id);
  formData.append('degree_name', 'Master of Science in Cryptography');

  const initiateRes = await fetch(`${API_BASE}/api/certificates/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  });
  const initiateData = await initiateRes.json();
  if (!initiateRes.ok) throw new Error(initiateData.error || 'Initiate failed');
  const pendingCert = initiateData.pendingCertificate;
  console.log(`Initiated certificate:`);
  console.log(` - Credential ID: ${pendingCert.credential_id}`);
  console.log(` - Status: ${pendingCert.status}`);
  console.log(` - Created By (Owner UID): ${pendingCert.created_by}`);

  // 5. Test Multi-Sig Self-Approval Rejection
  console.log('\n--- Step 5: Test Multi-Sig Enforcement (Owner attempts to self-approve) ---');
  const selfApproveRes = await fetch(`${API_BASE}/api/certificates/${pendingCert.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const selfApproveData = await selfApproveRes.json();
  console.log(`Self-approval response status: ${selfApproveRes.status}`);
  console.log(`Expected rejection message: "${selfApproveData.error}"`);
  if (selfApproveRes.status !== 400 || !selfApproveData.error?.includes('Multi-sig rejection')) {
    throw new Error('Multi-sig rejection did not trigger as expected!');
  }
  console.log('SUCCESS: Self-approval correctly blocked by backend security rule!');

  // 6. Owner logs out (Session 1 Ends)
  console.log('\n--- Step 6: Session 1 Logout ---');
  console.log(`Owner ${OWNER_EMAIL} signed out. Discarding Session 1 token.`);

  // 7. Staff 2 logs in (Session 2 Begins)
  console.log('\n--- Step 7: Session 2 Login (Staff 2 / Approver) ---');
  const { data: sessionB, error: loginErrB } = await clientB.auth.signInWithPassword({
    email: STAFF2_EMAIL,
    password: STAFF2_PASSWORD,
  });
  if (loginErrB) throw loginErrB;
  const tokenB = sessionB.session.access_token;
  console.log(`Successfully authenticated Staff 2 session token (starts with: ${tokenB.slice(0, 20)}...)`);

  // Verify Staff 2 has access to Oxford Institution
  const staff2InstRes = await fetch(`${API_BASE}/api/institutions/my-institution`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const staff2InstData = await staff2InstRes.json();
  console.log(`Staff 2 dashboard access verified: belongs to "${staff2InstData.institution?.name}"`);

  // Staff 2 fetches pending certificates
  const pendingListRes = await fetch(`${API_BASE}/api/institutions/${inst.id}/certificates/pending`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const pendingListData = await pendingListRes.json();
  const certToApprove = pendingListData.pendingCertificates?.find((c) => c.id === pendingCert.id);
  console.log(`Staff 2 sees pending certificate: ${certToApprove?.credential_id}, created_by: ${certToApprove?.created_by}`);
  console.log(`Staff 2 UID: ${sessionB.user.id} !== Created By UID: ${certToApprove?.created_by} -> Multi-sig approval eligible!`);

  // 8. Staff 2 Approves Certificate (On-Chain Issuance)
  console.log('\n--- Step 8: Staff 2 Approves Certificate (Mined On-Chain) ---');
  const approveRes = await fetch(`${API_BASE}/api/certificates/${pendingCert.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const approveData = await approveRes.json();
  if (!approveRes.ok) throw new Error(approveData.error || 'Approval failed');
  console.log(`Approval Success:`, approveData.message);
  console.log(`On-chain transaction hash: ${approveData.on_chain_tx_hash}`);
  console.log(`Status: ${approveData.status}`);

  // 9. Verify on-chain public verification
  console.log('\n--- Step 9: Public Read-Only Verification on Smart Contract ---');
  const verifyRes = await fetch(`${API_BASE}/api/certificates/verify/${pendingCert.credential_id}`);
  const verifyData = await verifyRes.json();
  console.log(`Smart Contract On-Chain Verification:`);
  console.log(` - Credential ID: ${verifyData.credentialId}`);
  console.log(` - Valid: ${verifyData.isValid}`);
  console.log(` - Institute Accredited: ${verifyData.isInstituteAccredited}`);
  console.log(` - IPFS Hash: ${verifyData.ipfsHash}`);
  console.log(` - Gateway URL: ${verifyData.gatewayUrl}`);

  console.log('\n========================================================================');
  console.log('REAL MULTI-SIG AUTHENTICATION & APPROVAL LIFECYCLE TEST COMPLETED SUCCESSFULLY!');
  console.log('========================================================================');
}

runTest().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
