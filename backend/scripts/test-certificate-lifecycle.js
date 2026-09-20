const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/server');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

function createSamplePdfBuffer(credentialId) {
  const timestamp = new Date().toISOString();
  const pdfString =
    `%PDF-1.4\n` +
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n` +
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n` +
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n` +
    `4 0 obj << /Length 95 >> stream\n` +
    `BT /F1 16 Tf 100 700 Td (Academic Credential: ${credentialId}) Tj ET\n` +
    `BT /F1 12 Tf 100 660 Td (Issued at: ${timestamp}) Tj ET\n` +
    `endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n360\n%%EOF\n`;

  return Buffer.from(pdfString, 'utf-8');
}

async function runTest() {
  console.log('======================================================================');
  console.log('  STAGE 5: E2E SMART CONTRACT & MULTI-SIG CERTIFICATE LIFECYCLE TEST  ');
  console.log('======================================================================');

  // Start test Express server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/certificates`;
  console.log(`Backend test server running at http://127.0.0.1:${port}`);

  try {
    const STAFF_1_ID = '11111111-1111-4111-8111-111111111111';
    const STAFF_2_ID = '22222222-2222-4222-8222-222222222222';
    const TEST_INSTITUTION_ID = 'c68d4561-5039-4390-8952-bf2955f90d6a';
    const TEST_STUDENT_ID = '1bc89ac3-956c-4794-805b-7bb007170a19';
    const runId = Date.now().toString().slice(-6);
    const testCredId = `CRED-E2E-${runId}`;

    console.log(`\nSimulating 2 Staff Accounts at Institution [${TEST_INSTITUTION_ID}]:`);
    console.log(` - Staff 1 (Initiator): ${STAFF_1_ID}`);
    console.log(` - Staff 2 (Approver) : ${STAFF_2_ID}`);
    console.log(` - Target Credential ID: ${testCredId}`);

    // -------------------------------------------------------------------------
    // STEP 1: Staff 1 initiates a certificate upload
    // -------------------------------------------------------------------------
    console.log('\n[STEP 1] Staff 1 initiates certificate via POST /api/certificates/initiate...');
    const pdfBuffer = createSamplePdfBuffer(testCredId);
    const localHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `${testCredId}.pdf`);
    formData.append('institution_id', TEST_INSTITUTION_ID);
    formData.append('student_id', TEST_STUDENT_ID);
    formData.append('credential_id', testCredId);
    formData.append('degree_name', 'B.S. in Computer Science & Cryptography');
    formData.append('issue_date', '2026-09-15');

    const initRes = await fetch(`${baseUrl}/initiate`, {
      method: 'POST',
      headers: {
        'x-user-id': STAFF_1_ID,
        'x-user-email': 'staff1@university.edu',
        'x-user-role': 'institution',
      },
      body: formData,
    });

    const initStatus = initRes.status;
    const initBody = await initRes.json();
    console.log(`   HTTP Status: ${initStatus}`);
    console.log('   Response Body:', JSON.stringify(initBody, null, 2));

    assert(initStatus === 201, `Expected status 201, received ${initStatus}`);
    assert(initBody.success === true, 'Response success should be true');
    assert(initBody.pendingCertificate, 'Response missing pendingCertificate');
    assert(initBody.pendingCertificate.status === 'pending_approval', 'Status must be pending_approval');
    assert(initBody.pendingCertificate.created_by === STAFF_1_ID, 'created_by must match Staff 1 ID');
    assert(initBody.pendingCertificate.sha256_hash === localHash, 'SHA-256 hash must match uploaded PDF bytes');
    assert(initBody.pendingCertificate.ipfs_cid.length > 0, 'IPFS CID must be populated from Pinata');

    const pendingCertId = initBody.pendingCertificate.id;
    const uploadedCid = initBody.pendingCertificate.ipfs_cid;
    console.log(`   ✔ STEP 1 PASSED: Certificate initiated (Pending ID: ${pendingCertId}, IPFS CID: ${uploadedCid})`);

    // -------------------------------------------------------------------------
    // STEP 2: Rejection Test - Same user (Staff 1) tries to approve
    // -------------------------------------------------------------------------
    console.log('\n[STEP 2] Testing Multi-Sig Enforcement: Staff 1 attempts to self-approve...');
    const selfApproveRes = await fetch(`${baseUrl}/${pendingCertId}/approve`, {
      method: 'POST',
      headers: {
        'x-user-id': STAFF_1_ID,
        'x-user-email': 'staff1@university.edu',
      },
    });

    const selfApproveStatus = selfApproveRes.status;
    const selfApproveBody = await selfApproveRes.json();
    console.log(`   HTTP Status: ${selfApproveStatus}`);
    console.log('   Response Body:', JSON.stringify(selfApproveBody, null, 2));

    assert(selfApproveStatus === 400, `Expected 400 Bad Request, got ${selfApproveStatus}`);
    assert(
      selfApproveBody.error && selfApproveBody.error.includes('Multi-sig rejection'),
      'Expected multi-sig rejection error message'
    );
    console.log('   ✔ STEP 2 PASSED: Self-approval successfully blocked by multi-sig policy!');

    // -------------------------------------------------------------------------
    // STEP 3: Legitimate Approval by Staff 2 -> Lands on Blockchain
    // -------------------------------------------------------------------------
    console.log('\n[STEP 3] Staff 2 approves certificate -> Calls issueCertificate() on-chain...');
    const approveRes = await fetch(`${baseUrl}/${pendingCertId}/approve`, {
      method: 'POST',
      headers: {
        'x-user-id': STAFF_2_ID,
        'x-user-email': 'staff2@university.edu',
      },
    });

    const approveStatus = approveRes.status;
    const approveBody = await approveRes.json();
    console.log(`   HTTP Status: ${approveStatus}`);
    console.log('   Response Body:', JSON.stringify(approveBody, null, 2));

    assert(approveStatus === 200, `Expected 200 OK, got ${approveStatus}`);
    assert(approveBody.success === true, 'Approval response success should be true');
    assert(approveBody.status === 'issued', 'Status must be issued');
    assert(
      typeof approveBody.on_chain_tx_hash === 'string' && approveBody.on_chain_tx_hash.startsWith('0x'),
      'Valid on-chain transaction hash required'
    );
    assert(approveBody.pendingCertificate.approved_by === STAFF_2_ID, 'approved_by must be Staff 2');

    const onChainTx = approveBody.on_chain_tx_hash;
    console.log(`   ✔ STEP 3 PASSED: Certificate approved & confirmed on-chain! Tx Hash: ${onChainTx}`);

    // -------------------------------------------------------------------------
    // STEP 4: Public Verification via GET /api/certificates/verify/:credentialId
    // -------------------------------------------------------------------------
    console.log(`\n[STEP 4] Calling public verification endpoint: GET /api/certificates/verify/${testCredId}...`);
    const verifyRes = await fetch(`${baseUrl}/verify/${testCredId}`);
    const verifyStatus = verifyRes.status;
    const verifyBody = await verifyRes.json();

    console.log(`   HTTP Status: ${verifyStatus}`);
    console.log('   Verification Output:', JSON.stringify(verifyBody, null, 2));

    assert(verifyStatus === 200, `Expected status 200, got ${verifyStatus}`);
    assert(verifyBody.success === true, 'Verification success should be true');
    assert(verifyBody.credentialId === testCredId, 'Credential ID should match');
    assert(verifyBody.ipfsHash === uploadedCid, 'IPFS CID on-chain must match uploaded Pinata CID');
    assert(verifyBody.revoked === false, 'Certificate must not be revoked');
    assert(verifyBody.institutionId === TEST_INSTITUTION_ID, 'Institution ID must match');
    assert(verifyBody.isInstituteAccredited === true, 'Live accreditation status must be true');
    assert(verifyBody.isValid === true, 'Certificate isValid flag must be true');
    assert(
      typeof verifyBody.gatewayUrl === 'string' && verifyBody.gatewayUrl.startsWith('https://'),
      'Gateway URL must be valid HTTPS link'
    );
    console.log('   ✔ STEP 4 PASSED: Public on-chain verification confirmed accurate!');

    // -------------------------------------------------------------------------
    // STEP 5: Verification of non-existent credential (Expected 404)
    // -------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing verification of non-existent credential...');
    const fakeCredId = 'NON-EXISTENT-CRED-999999';
    const fakeRes = await fetch(`${baseUrl}/verify/${fakeCredId}`);
    console.log(`   HTTP Status for non-existent credential: ${fakeRes.status}`);
    assert(fakeRes.status === 404, `Expected 404 for unknown credential, got ${fakeRes.status}`);
    console.log('   ✔ STEP 5 PASSED: Non-existent credentials return 404 properly.');

    console.log('\n======================================================================');
    console.log('🎉 ALL STAGE 5 TESTS PASSED SUCCESSFULLY!');
    console.log('   1. Upload & Initiation with Staff 1 authenticated');
    console.log('   2. Multi-Sig Rejection on self-approval attempt');
    console.log('   3. Second Staff Member approval & On-Chain Issuance confirmed');
    console.log(`   4. Transaction mined on local Hardhat node: ${onChainTx}`);
    console.log(`   5. Public on-chain verification returns authentic, accredited data`);
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('\n❌ Lifecycle Test Failed:', err);
  process.exit(1);
});
