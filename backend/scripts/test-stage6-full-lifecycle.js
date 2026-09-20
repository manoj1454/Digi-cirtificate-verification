const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5001';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runStage6E2ETest() {
  console.log('==============================================================================');
  console.log('  STAGE 6 FULL LIFECYCLE END-TO-END VERIFICATION');
  console.log('  Testing: Institution Signup -> Regulator Approval -> Student Enrollment ->');
  console.log('           Multi-Sig Issuance -> Student Wallet -> Company Verification ->');
  console.log('           Accreditation Revocation -> Re-Verification (Unaccredited)');
  console.log('==============================================================================\n');

  const runId = Date.now().toString().slice(-5);
  const instName = `Cambridge Quantum Academy #${runId}`;
  const regNumber = `REG-CQA-${runId}`;
  const instEmail = `admin.cqa.${runId}@cambridge.edu`;

  const STAFF_1_ID = `11111111-cqa1-4111-8111-${runId}1111111`;
  const STAFF_2_ID = `22222222-cqa2-4222-8222-${runId}2222222`;

  // ---------------------------------------------------------------------------
  // STEP 1: Institution Registration (Pending Status)
  // ---------------------------------------------------------------------------
  console.log('[STEP 1] Registering a fresh institution...');
  const { supabase } = require('../src/config/supabase');

  // Create institution user and row in Supabase
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: instEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { role: 'institution', institutionName: instName, registrationNumber: regNumber },
  });

  if (authErr) {
    throw new Error(`Failed to create institution auth user: ${authErr.message}`);
  }

  const instUserId = authUser.user.id;
  const { data: instRow, error: instInsertErr } = await supabase
    .from('institutions')
    .insert({
      user_id: instUserId,
      name: instName,
      registration_number: regNumber,
      status: 'pending',
    })
    .select()
    .single();

  if (instInsertErr) {
    throw new Error(`Failed to insert institution row: ${instInsertErr.message}`);
  }

  console.log(`   ✔ Institution registered: "${instRow.name}" (ID: ${instRow.id})`);
  console.log(`   ✔ Current Status: ${instRow.status.toUpperCase()} (Waiting for regulator approval)`);
  assert(instRow.status === 'pending', 'Newly registered institution must have status = pending');

  // ---------------------------------------------------------------------------
  // STEP 2: Regulator Approval & On-Chain Registration
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 2] Regulator approves institution on-chain...');
  const approveRes = await fetch(`${API_BASE}/api/institutions/${instRow.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const approveData = await approveRes.json();
  console.log('   Approve Response:', approveData);
  assert(approveRes.status === 200, `Expected 200 from approve endpoint, got ${approveRes.status}`);
  assert(approveData.success === true, 'Approval response success must be true');
  assert(approveData.institution.status === 'approved', 'Institution status must now be approved');
  assert(approveData.institution.isAccreditedOnChain === true, 'isAccreditedOnChain must be true');
  console.log('   ✔ STEP 2 PASSED: Institution approved in Supabase and registered on-chain in Registry.sol!');

  // ---------------------------------------------------------------------------
  // STEP 3: Student Enrollment & Multi-Sig Certificate Issuance
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 3] Institution Dashboard: Enrolling student...');
  const studentRes = await fetch(`${API_BASE}/api/institutions/${instRow.id}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Lucas Montgomery',
      roll_number: `CQA-CS-${runId}`,
      email: `lucas.${runId}@student.edu`,
    }),
  });

  const studentData = await studentRes.json();
  assert(studentRes.status === 201, `Failed to add student: ${JSON.stringify(studentData)}`);
  const enrolledStudent = studentData.student;
  console.log(`   ✔ Enrolled Student: "${enrolledStudent.full_name}" (ID: ${enrolledStudent.id})`);

  console.log('\n   Initiating certificate as Staff 1 (Alice)...');
  const pdfFilePath = path.resolve(__dirname, '../../test-cert.pdf');
  const pdfBytes = fs.readFileSync(pdfFilePath);

  const form = new FormData();
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'degree.pdf');
  form.append('institution_id', instRow.id);
  form.append('student_id', enrolledStudent.id);
  form.append('degree_name', 'B.S. in Quantum Computing & Cryptography');
  form.append('issue_date', '2026-09-15');

  const initiateRes = await fetch(`${API_BASE}/api/certificates/initiate`, {
    method: 'POST',
    headers: {
      'x-user-id': STAFF_1_ID,
      'x-user-email': 'alice.staff@cqa.edu',
      'x-user-role': 'institution',
    },
    body: form,
  });

  const initiateData = await initiateRes.json();
  assert(initiateRes.status === 201, `Initiation failed: ${JSON.stringify(initiateData)}`);
  const pendingCert = initiateData.pendingCertificate;
  const credentialId = pendingCert.credential_id;
  console.log(`   ✔ Certificate initiated with Auto-Generated Credential ID: ${credentialId}`);
  console.log(`   ✔ IPFS CID: ${pendingCert.ipfs_cid}`);
  assert(pendingCert.created_by === STAFF_1_ID, 'created_by must match Staff 1');
  assert(pendingCert.status === 'pending_approval', 'Status must be pending_approval');

  // Test multi-sig rejection (Staff 1 attempts to self-approve)
  console.log('\n   Testing Multi-Sig: Staff 1 attempts to approve their own certificate...');
  const selfApproveRes = await fetch(`${API_BASE}/api/certificates/${pendingCert.id}/approve`, {
    method: 'POST',
    headers: { 'x-user-id': STAFF_1_ID },
  });
  const selfApproveData = await selfApproveRes.json();
  assert(selfApproveRes.status === 400, 'Self approval must be rejected with 400');
  console.log(`   ✔ Self-approval blocked as expected: "${selfApproveData.error}"`);

  // Staff 2 approves
  console.log('\n   Staff 2 (Bob) approves certificate on-chain...');
  const staff2ApproveRes = await fetch(`${API_BASE}/api/certificates/${pendingCert.id}/approve`, {
    method: 'POST',
    headers: { 'x-user-id': STAFF_2_ID },
  });

  const staff2ApproveData = await staff2ApproveRes.json();
  assert(staff2ApproveRes.status === 200, `Staff 2 approval failed: ${JSON.stringify(staff2ApproveData)}`);
  assert(staff2ApproveData.status === 'issued', 'Certificate status must be issued');
  console.log(`   ✔ Certificate approved and mined on-chain! Tx: ${staff2ApproveData.on_chain_tx_hash}`);
  console.log('   ✔ STEP 3 PASSED: Multi-sig issuance complete!');

  // ---------------------------------------------------------------------------
  // STEP 4: Student Dashboard
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 4] Student Dashboard: Fetching student credentials...');
  const studentWalletRes = await fetch(`${API_BASE}/api/students/certificates`, {
    headers: { 'x-user-id': enrolledStudent.user_id },
  });

  const studentWalletData = await studentWalletRes.json();
  assert(studentWalletRes.status === 200, 'Failed to fetch student wallet');
  const foundCert = (studentWalletData.certificates || []).find((c) => c.credential_id === credentialId);
  console.log('   Student Wallet Certificates Found:', studentWalletData.certificates?.length);
  assert(foundCert, `Certificate ${credentialId} must appear in student wallet`);
  assert(foundCert.gatewayUrl && foundCert.gatewayUrl.startsWith('https://'), 'Must include IPFS gatewayUrl');
  console.log(`   ✔ Found credential: ${foundCert.credential_id}`);
  console.log(`   ✔ Gateway URL: ${foundCert.gatewayUrl}`);
  console.log('   ✔ STEP 4 PASSED: Student can access credential and view PDF!');

  // ---------------------------------------------------------------------------
  // STEP 5: Company Verification - Outcome 1 (Valid)
  // ---------------------------------------------------------------------------
  console.log(`\n[STEP 5] Company Dashboard: Verifying ${credentialId}...`);
  const verifyRes1 = await fetch(`${API_BASE}/api/certificates/verify/${credentialId}`);
  const verifyData1 = await verifyRes1.json();

  console.log('   Verification Output (Outcome 1):', verifyData1);
  assert(verifyRes1.status === 200, 'Verify endpoint must return 200');
  assert(verifyData1.isValid === true, 'isValid must be true');
  assert(verifyData1.revoked === false, 'revoked must be false');
  assert(verifyData1.isInstituteAccredited === true, 'isInstituteAccredited must be true');
  console.log('   ✔ STEP 5 PASSED: Outcome 1 (VALID - Green state) confirmed!');

  // ---------------------------------------------------------------------------
  // STEP 6: Regulator Revokes Accreditation
  // ---------------------------------------------------------------------------
  console.log(`\n[STEP 6] Regulator revokes accreditation for institution [${instRow.id}] on-chain...`);
  const revokeAccredRes = await fetch(`${API_BASE}/api/institutions/${instRow.id}/accreditation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accredited: false }),
  });

  const revokeAccredData = await revokeAccredRes.json();
  assert(revokeAccredRes.status === 200, 'Revoke accreditation failed');
  assert(revokeAccredData.accredited === false, 'Accredited must be false');
  console.log(`   ✔ Accreditation revoked on-chain! Tx: ${revokeAccredData.txHash}`);
  console.log('   ✔ STEP 6 PASSED: Institution is now unaccredited in Registry.sol');

  // ---------------------------------------------------------------------------
  // STEP 7: Company Re-Verification - Outcome 3 (Issuer No Longer Accredited)
  // ---------------------------------------------------------------------------
  console.log(`\n[STEP 7] Company re-verifies the same credential ${credentialId}...`);
  const verifyRes2 = await fetch(`${API_BASE}/api/certificates/verify/${credentialId}`);
  const verifyData2 = await verifyRes2.json();

  console.log('   Verification Output (Outcome 3):', verifyData2);
  assert(verifyRes2.status === 200, 'Verify endpoint must return 200');
  assert(verifyData2.revoked === false, 'Certificate itself must not be revoked');
  assert(verifyData2.isInstituteAccredited === false, 'isInstituteAccredited must be false!');
  assert(verifyData2.isValid === false, 'isValid must now be false due to revoked accreditation');
  console.log('   ✔ STEP 7 PASSED: Outcome 3 (ISSUER NO LONGER ACCREDITED - Amber state) confirmed!');

  console.log('\n==============================================================================');
  console.log('🎉 ALL 7 STAGE 6 LIFECYCLE STEPS VERIFIED END-TO-END SUCCESSFULLY!');
  console.log('==============================================================================\n');
}

runStage6E2ETest().catch((err) => {
  console.error('\n❌ E2E Verification Failed:', err);
  process.exit(1);
});
