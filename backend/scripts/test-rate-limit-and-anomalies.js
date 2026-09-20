const assert = require('assert');

const API_BASE = 'http://localhost:5001';

async function main() {
  console.log('================================================================');
  console.log('  TEST SUITE: RATE LIMITING, ANOMALY MONITORING, & AUDIT TRAIL');
  console.log('================================================================\n');

  // ===========================================================================
  // 1. TEST: Rate Limiting on GET /api/certificates/verify/:credentialId
  // ===========================================================================
  console.log('--- 1. Testing Rate Limiting (GET /api/certificates/verify/:credentialId) ---');
  console.log('Configured rate limit: 30 requests per minute per IP.\n');

  const credentialId = 'CRED-TEST-STUDENT-001';
  let successCount = 0;
  let rateLimitedCount = 0;
  let first429Response = null;

  console.log('Sending 35 consecutive verification requests in rapid succession...');
  for (let i = 1; i <= 35; i++) {
    const res = await fetch(`${API_BASE}/api/certificates/verify/${credentialId}`);
    if (res.status === 200) {
      successCount++;
    } else if (res.status === 429) {
      rateLimitedCount++;
      if (!first429Response) {
        first429Response = await res.json();
      }
    } else {
      console.warn(`Request #${i} returned status: ${res.status}`);
    }
  }

  console.log(`   Completed 35 requests:`);
  console.log(`   - Successful / Allowed: ${successCount} requests`);
  console.log(`   - Rate Limited (429)   : ${rateLimitedCount} requests`);
  console.log(`   - 429 Response Payload :`, JSON.stringify(first429Response));

  assert(
    rateLimitedCount >= 5,
    `Expected at least 5 requests to be rate-limited (HTTP 429), but got ${rateLimitedCount}`
  );
  assert(
    first429Response && first429Response.error && first429Response.error.includes('Too many verification requests'),
    'Expected clear 429 error message in JSON payload'
  );
  console.log('   ✔ PASS: Rate limiting middleware properly blocked requests beyond 30/min with HTTP 429.\n');

  // ===========================================================================
  // 2. TEST: Anomaly Monitoring Rule
  // ===========================================================================
  console.log('--- 2. Testing Anomaly Monitoring Rule ---');
  const { checkIssuanceAnomaly, getAnomalyFlags } = require('../src/services/anomalyService');
  const { supabase } = require('../src/config/supabase');
  const testInstitutionId = '5695fb1c-818a-49b4-bbe3-2b6cbd60bb59'; // Oxford University

  // Insert a fresh test certificate created right now for Oxford
  const testCredId = `CRED-ANOMALY-TEST-${Date.now().toString().slice(-6)}`;
  console.log(`Inserting fresh certificate (${testCredId}) for institution ${testInstitutionId}...`);
  await supabase.from('certificates').insert({
    credential_id: testCredId,
    institution_id: testInstitutionId,
    student_id: 'a0a7fdab-b081-461b-b14a-e9ed11e1f3f8',
    degree_name: 'Anomaly Test Degree',
    issue_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    revoked: false,
  });

  console.log(`Simulating issuance anomaly check for Institution ${testInstitutionId}...`);
  // Set temporary environment threshold to 1 so the check triggers
  const prevThreshold = process.env.ISSUANCE_HOURLY_THRESHOLD;
  process.env.ISSUANCE_HOURLY_THRESHOLD = '1';

  const anomaly = await checkIssuanceAnomaly(testInstitutionId);
  console.log('   Anomaly check output:', anomaly);


  // Restore threshold
  if (prevThreshold) {
    process.env.ISSUANCE_HOURLY_THRESHOLD = prevThreshold;
  } else {
    delete process.env.ISSUANCE_HOURLY_THRESHOLD;
  }

  assert(anomaly !== null, 'Expected checkIssuanceAnomaly to detect and flag high issuance rate');
  assert.strictEqual(anomaly.institution_id, testInstitutionId);
  assert.strictEqual(anomaly.event_type, 'excessive_issuance');

  // Query anomaly flags via API endpoint
  console.log('Querying anomaly flags from API endpoint: GET /api/institutions/:id/anomalies...');
  const anomalyRes = await fetch(`${API_BASE}/api/institutions/${testInstitutionId}/anomalies`);
  const anomalyData = await anomalyRes.json();
  console.log(`   API returned ${anomalyData.anomalies?.length || 0} flagged anomaly event(s) for institution.`);

  assert(
    anomalyData.anomalies && anomalyData.anomalies.length > 0,
    'Expected at least one anomaly record returned from queryable endpoint'
  );
  const flagged = anomalyData.anomalies[0];
  console.log('   Flagged record details:', {
    institution_id: flagged.institution_id,
    event_type: flagged.event_type,
    count: flagged.count,
    threshold: flagged.threshold,
    window_hours: flagged.window_hours,
  });
  console.log('   ✔ PASS: Anomaly detected, logged, and queryable via backend endpoint without blocking issuance.\n');

  // ===========================================================================
  // 3. TEST: Audit Trail Completeness (POST /api/certificates/verify-log)
  // ===========================================================================
  console.log('--- 3. Testing Audit Trail Completeness (POST /api/certificates/verify-log) ---');
  const testIp = '198.51.100.42';
  const testUserAgent = 'AntigravityAuditTester/2.0 (SecurityVerification)';

  console.log(`Submitting verification log with custom IP (${testIp}) and User-Agent...`);
  const logRes = await fetch(`${API_BASE}/api/certificates/verify-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp,
      'User-Agent': testUserAgent,
    },
    body: JSON.stringify({
      credential_id: 'CRED-AUDIT-TEST-999',
      result: 'VALID',
    }),
  });

  const logData = await logRes.json();
  console.log('   Logged response payload:', logData);

  assert(logData.success, 'Expected verification log insertion to succeed');
  assert(logData.log, 'Expected log object in response');
  assert.strictEqual(logData.log.credential_id, 'CRED-AUDIT-TEST-999');
  assert.strictEqual(logData.log.result, 'VALID');
  assert(logData.log.timestamp, 'Expected ISO timestamp in log');
  assert.strictEqual(logData.log.ip_address, testIp, `Expected IP address to match ${testIp}`);
  assert.strictEqual(logData.log.user_agent, testUserAgent, `Expected User-Agent to match ${testUserAgent}`);

  console.log('   Verified captured audit fields:');
  console.log(`   - Who (company_user_id) : ${logData.log.company_user_id}`);
  console.log(`   - What (credential_id)  : ${logData.log.credential_id}`);
  console.log(`   - Result                : ${logData.log.result}`);
  console.log(`   - Timestamp             : ${logData.log.timestamp}`);
  console.log(`   - Client IP Address     : ${logData.log.ip_address}`);
  console.log(`   - Client User-Agent     : ${logData.log.user_agent}`);
  console.log('   ✔ PASS: Verification logs capture complete audit telemetry (verifier, credential, result, timestamp, IP, user-agent).\n');

  console.log('================================================================');
  console.log('   ALL SECURITY HARDENING VERIFICATION CHECKS PASSED!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
