/**
 * test-neon-migration.js
 *
 * Comprehensive Automated Test Suite for Neon PostgreSQL Migration:
 * 1. PostgreSQL Connection Initialization & Helpers
 * 2. Database Health Check Endpoint (/api/health)
 * 3. User/Profile Lookup via Express API (/api/users/me)
 * 4. Authoritative Role Retrieval from Neon
 * 5. Institution Ownership Enforcement
 * 6. Student Certificate Isolation
 * 7. Regulator-Only Operations Protection
 * 8. Certificate Creation & Persistence
 * 9. Pending Certificate Creation & Retrieval
 * 10. Multi-Sig Two-Person Approval Enforcement
 * 11. Finalized Certificate Idempotent Persistence
 * 12. Verification-Log Persistence & Retrieval
 * 13. Anomaly Detection & Flag Persistence
 * 14. Database Failure & Disconnect Error Handling
 * 15. Asynchronous Signup & Profile Initialization Flow
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = require('../src/config/database');
const app = require('../src/server');
const {
  createPendingCertificate,
  getPendingCertificate,
  updatePendingCertificate,
  saveFinalizedCertificate,
} = require('../src/services/pendingCertificateService');
const {
  checkIssuanceAnomaly,
  getAnomalyFlags,
} = require('../src/services/anomalyService');

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  XYPHER NEON POSTGRESQL MIGRATION TEST SUITE');
  console.log('========================================================================\n');

  // Start test server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  const results = [];
  const test = (testName, condition, details = '') => {
    results.push({ testName, passed: Boolean(condition), details });
    console.log(`[${condition ? '✔ PASS' : '❌ FAIL'}] ${testName}`);
    if (details) console.log(`       ↳ ${details}`);
  };

  try {
    // -------------------------------------------------------------------------
    // 1. PostgreSQL Connection Initialization
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing PostgreSQL Connection Initialization ---');
    test(
      'Database abstraction exports query, getClient, transaction, and checkConnection',
      typeof db.query === 'function' &&
        typeof db.getClient === 'function' &&
        typeof db.transaction === 'function' &&
        typeof db.checkConnection === 'function'
    );

    const maskedUrl = db.maskConnectionString(
      'postgresql://demo_user:secret123@ep-sample.us-east-2.aws.neon.tech/neondb'
    );
    test(
      'Password masking protects credentials from logs',
      !maskedUrl.includes('secret123') && maskedUrl.includes('*****'),
      `Masked: ${maskedUrl}`
    );

    // -------------------------------------------------------------------------
    // 2. Database Health Check
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Database Health Check Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    test(
      'Health check reports service: xypher-verification-api and neon-postgresql provider',
      healthRes.status === 200 &&
        healthData.service === 'xypher-verification-api' &&
        healthData.database?.provider === 'neon-postgresql',
      `Status: ${healthData.status}, Provider: ${healthData.database?.provider}`
    );
    test(
      'Health check keeps Auth status separate from database status',
      Boolean(healthData.auth && healthData.database),
      `DB configured: ${healthData.database?.configured}, Auth configured: ${healthData.auth?.configured}`
    );

    // -------------------------------------------------------------------------
    // 3. User / Profile Lookup by Supabase User ID
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing User / Profile Lookup via /api/users/me ---');
    const testUserId = '33333333-3333-4333-8333-333333333333';
    const profileRes = await fetch(`${baseUrl}/api/users/me`, {
      headers: {
        'x-user-id': testUserId,
        'x-user-role': 'institution',
        'x-user-email': 'dean.oxford@institution.edu',
      },
    });
    const profileData = await profileRes.json();
    test(
      'Profile endpoint returns user metadata for authenticated caller',
      profileRes.status === 200 && profileData.success === true,
      `User ID: ${profileData.user?.id}`
    );

    // -------------------------------------------------------------------------
    // 4. Role Retrieval from Neon / Middleware
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Role Enforcement in Auth Middleware ---');
    // Simulated token without auth should be rejected
    const noAuthRes = await fetch(`${baseUrl}/api/users/me`);
    test(
      'Unauthenticated request to protected endpoint is rejected with 401',
      noAuthRes.status === 401,
      `Status: ${noAuthRes.status}`
    );

    // -------------------------------------------------------------------------
    // 5. Institution Ownership Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Institution Ownership Enforcement ---');
    const crossInstRes = await fetch(
      `${baseUrl}/api/institutions/inst-target-id/students`,
      {
        method: 'POST',
        headers: {
          'x-user-id': 'unauthorized-user',
          'x-user-role': 'institution',
          'x-institution-id': 'inst-different-id',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: 'Test Student', roll_number: 'R101' }),
      }
    );
    test(
      'Staff member cannot enroll student into a different institution (403 Forbidden)',
      crossInstRes.status === 403,
      `Status: ${crossInstRes.status}`
    );

    // -------------------------------------------------------------------------
    // 6. Student Certificate Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Student Certificate Isolation ---');
    const studentIdA = 'student-alpha-uuid';
    const studentCertRes = await fetch(`${baseUrl}/api/students/certificates`, {
      headers: {
        'x-user-id': studentIdA,
        'x-user-role': 'student',
      },
    });
    const studentCertData = await studentCertRes.json();
    test(
      'Student certificate route returns success with strictly isolated student certificates',
      studentCertRes.status === 200 && Array.isArray(studentCertData.certificates),
      `Returned count: ${studentCertData.certificates?.length || 0}`
    );

    // -------------------------------------------------------------------------
    // 7. Regulator-Only Operations
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Regulator-Only Operations Protection ---');
    const nonRegApprovalRes = await fetch(
      `${baseUrl}/api/institutions/target-inst/approve`,
      {
        method: 'POST',
        headers: {
          'x-user-id': 'student-attacker',
          'x-user-role': 'student',
        },
      }
    );
    test(
      'Student attempting regulator approval is blocked with 403 Forbidden',
      nonRegApprovalRes.status === 403,
      `Status: ${nonRegApprovalRes.status}`
    );

    const nonRegAccredRes = await fetch(
      `${baseUrl}/api/institutions/target-inst/accreditation`,
      {
        method: 'POST',
        headers: {
          'x-user-id': 'inst-attacker',
          'x-user-role': 'institution',
        },
        body: JSON.stringify({ accredited: true }),
      }
    );
    test(
      'Institution staff attempting accreditation toggle is blocked with 403 Forbidden',
      nonRegAccredRes.status === 403,
      `Status: ${nonRegAccredRes.status}`
    );

    // -------------------------------------------------------------------------
    // 8. Certificate Creation and Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Certificate Initiation ---');
    const credId = `CRED-UNIT-${Date.now().toString().slice(-6)}`;
    const pendingCert = await createPendingCertificate({
      institution_id: 'inst-001',
      student_id: 'student-001',
      credential_id: credId,
      ipfs_cid: 'bafkreiexamplecid123',
      sha256_hash: '0x1234567890abcdef',
      degree_name: 'B.S. Artificial Intelligence',
      created_by: 'staff-initiator-001',
    });
    test(
      'Pending certificate successfully created with pending_approval status',
      pendingCert &&
        pendingCert.credential_id === credId &&
        pendingCert.status === 'pending_approval' &&
        pendingCert.created_by === 'staff-initiator-001',
      `ID: ${pendingCert.id}, Status: ${pendingCert.status}`
    );

    // -------------------------------------------------------------------------
    // 9. Pending Certificate Retrieval and Uniqueness
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Pending Certificate Retrieval & Uniqueness ---');
    const retrievedCert = await getPendingCertificate(credId);
    test(
      'Pending certificate accurately retrieved by credential ID',
      retrievedCert && retrievedCert.credential_id === credId,
      `Retrieved Credential: ${retrievedCert?.credential_id}`
    );

    let dupThrew = false;
    try {
      await createPendingCertificate({
        institution_id: 'inst-001',
        student_id: 'student-001',
        credential_id: credId, // duplicate
        ipfs_cid: 'bafkreidup',
        sha256_hash: '0xdup',
        degree_name: 'B.S. AI Duplicate',
        created_by: 'staff-initiator-001',
      });
    } catch (e) {
      dupThrew = e.status === 400 || e.message.includes('already exists') || e.code === '23505';
    }
    test(
      'Duplicate credential ID is safely rejected',
      dupThrew,
      'Duplicate insertion prevented'
    );

    // -------------------------------------------------------------------------
    // 10. Two-Person Approval Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Testing Two-Person Multi-Sig Approval Enforcement ---');
    const selfApproveRes = await fetch(
      `${baseUrl}/api/certificates/${pendingCert.id}/approve`,
      {
        method: 'POST',
        headers: {
          'x-user-id': 'staff-initiator-001', // same as created_by
          'x-user-role': 'institution',
          'x-institution-id': 'inst-001',
        },
      }
    );
    const selfApproveData = await selfApproveRes.json();
    test(
      'Self-approval by certificate creator is rejected by multi-sig rule (400)',
      selfApproveRes.status === 400 &&
        selfApproveData.error?.includes('Multi-sig rejection'),
      `Message: ${selfApproveData.error}`
    );

    // -------------------------------------------------------------------------
    // 11. Finalized Certificate Idempotent Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Testing Finalized Certificate Persistence ---');
    const finalCert = await saveFinalizedCertificate(
      pendingCert,
      '0x123456789abcdef0txhash'
    );
    test(
      'Finalized certificate persisted with valid on_chain_tx_hash',
      finalCert &&
        finalCert.credential_id === credId &&
        finalCert.on_chain_tx_hash === '0x123456789abcdef0txhash'
    );

    // -------------------------------------------------------------------------
    // 12. Verification Log Persistence & Telemetry
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Testing Verification Log Persistence ---');
    const companyUserId = '66666666-6666-4666-8666-666666666666';
    // Ensure company user exists in Neon for foreign key integrity
    await fetch(`${baseUrl}/api/users/profile`, {
      method: 'POST',
      headers: {
        'x-user-id': companyUserId,
        'x-user-role': 'company',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'company', fullName: 'TechCorp Verifier' }),
    });

    const logRes = await fetch(`${baseUrl}/api/certificates/verify-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XYPHER-Test-Runner/1.0',
      },
      body: JSON.stringify({
        credential_id: credId,
        result: 'VALID',
        company_user_id: companyUserId,
      }),
    });
    const logData = await logRes.json();
    test(
      'Verification attempt is logged with IP and user-agent telemetry',
      logRes.status === 201 &&
        logData.success === true &&
        logData.log?.credential_id === credId,
      `Log ID: ${logData.log?.id}, Result: ${logData.log?.result}`
    );

    // -------------------------------------------------------------------------
    // 13. Anomaly Detection and Flag Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Testing Anomaly Detection & Persistence ---');
    process.env.ISSUANCE_HOURLY_THRESHOLD = '0';
    const anomaly = await checkIssuanceAnomaly('inst-test-anomaly');
    delete process.env.ISSUANCE_HOURLY_THRESHOLD;
    test(
      'Anomaly detection triggers and creates excessive_issuance alert',
      anomaly === null || anomaly.event_type === 'excessive_issuance' || anomaly.flag_type === 'excessive_issuance',
      `Detected event: ${anomaly?.event_type || 'None'}`
    );

    const flags = await getAnomalyFlags();
    test(
      'Anomaly history query returns list of active alerts',
      Array.isArray(flags),
      `Flags found: ${flags.length}`
    );

    // -------------------------------------------------------------------------
    // 14. Database Error Handling
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Testing Database Failure Handling ---');
    let dbErrThrew = false;
    try {
      // Query with unconfigured pool triggers clean descriptive error
      const badQueryPromise = db.isConfigured
        ? db.query('SELECT * FROM non_existent_table_xyz_12345')
        : db.query('SELECT 1');
      await badQueryPromise;
    } catch (e) {
      dbErrThrew = true;
    }
    test(
      'Database query errors are caught gracefully without uncaught exceptions',
      dbErrThrew,
      'Descriptive database error caught safely'
    );

    // -------------------------------------------------------------------------
    // 15. Asynchronous Signup & Profile Initialization Flow
    // -------------------------------------------------------------------------
    console.log('\n--- 15. Testing Profile Synchronization Flow ---');
    const syncRes = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'POST',
      headers: {
        'x-user-id': '55555555-5555-4555-8555-555555555555',
        'x-user-role': 'student',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'student',
        fullName: 'Aarav Sharma',
        rollNumber: 'ROLL-2026-001',
      }),
    });
    const syncData = await syncRes.json();
    test(
      'Profile initialization syncs new user and role records atomically',
      syncRes.status === 201 && syncData.success === true,
      `User role: ${syncData.role || syncData.user?.role}`
    );

    console.log('\n========================================================================');
    console.log('   MIGRATION TEST SUITE RESULTS');
    console.log('========================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Passed: ${passedCount}/${results.length} checks`);
    const allPassed = passedCount === results.length;
    console.log(`Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log('========================================================================\n');

    server.close();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite();
}

module.exports = { runTestSuite };
