const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/server');
const { getGatewayUrl, computeSha256 } = require('../src/config/pinata');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

// Generate a valid minimal PDF buffer
function createSamplePdfBuffer() {
  const timestamp = new Date().toISOString();
  const pdfString =
    `%PDF-1.4\n` +
    `%\n` +
    `1 0 obj\n` +
    `<< /Type /Catalog /Pages 2 0 R >>\n` +
    `endobj\n` +
    `2 0 obj\n` +
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n` +
    `endobj\n` +
    `3 0 obj\n` +
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\n` +
    `endobj\n` +
    `4 0 obj\n` +
    `<< /Length 85 >>\n` +
    `stream\n` +
    `BT /F1 14 Tf 100 700 Td (Pinata IPFS Certificate Integrity Test - ${timestamp}) Tj ET\n` +
    `endstream\n` +
    `endobj\n` +
    `xref\n` +
    `0 5\n` +
    `0000000000 65535 f \n` +
    `0000000015 00000 n \n` +
    `0000000064 00000 n \n` +
    `0000000121 00000 n \n` +
    `0000000213 00000 n \n` +
    `trailer\n` +
    `<< /Size 5 /Root 1 0 R >>\n` +
    `startxref\n` +
    `350\n` +
    `%%EOF\n`;

  return Buffer.from(pdfString, 'utf-8');
}

async function runTest() {
  console.log('====================================================');
  console.log('Pinata IPFS Certificate Upload & Retrieval Test');
  console.log('====================================================');

  // Step 1: Prepare sample PDF and compute expected hash
  console.log('\n[Step 1] Creating sample PDF and computing local SHA-256 hash...');
  const samplePdfBuffer = createSamplePdfBuffer();
  const localSha256 = computeSha256(samplePdfBuffer);
  console.log(`   Sample PDF Size: ${samplePdfBuffer.length} bytes`);
  console.log(`   Local SHA-256:   ${localSha256}`);

  // Step 2: Spin up test HTTP server
  console.log('\n[Step 2] Starting Express test server on ephemeral port...');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const uploadEndpoint = `http://127.0.0.1:${port}/api/certificates/upload`;
  console.log(`   Test server running at: ${uploadEndpoint}`);

  try {
    // Step 3: Send POST multipart upload request to /api/certificates/upload
    console.log('\n[Step 3] Uploading PDF via POST /api/certificates/upload...');
    const formData = new FormData();
    const pdfBlob = new Blob([samplePdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'sample-certificate.pdf');

    const uploadResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    });

    const responseStatus = uploadResponse.status;
    const responseBody = await uploadResponse.json();

    console.log(`   HTTP Status: ${responseStatus}`);
    console.log('   Response Body:', JSON.stringify(responseBody, null, 2));

    assert(responseStatus === 201, `Expected status 201, got ${responseStatus}`);
    assert(responseBody.success === true, 'Response success should be true');
    assert(typeof responseBody.cid === 'string' && responseBody.cid.length > 0, 'CID must be returned');
    assert(responseBody.sha256 === localSha256, 'Returned SHA-256 does not match local upload hash');
    assert(typeof responseBody.gatewayUrl === 'string' && responseBody.gatewayUrl.startsWith('https://'), 'Gateway URL should be valid HTTPS link');

    const cid = responseBody.cid;
    const gatewayUrl = responseBody.gatewayUrl;
    console.log(`\n   ✔ Upload successful!`);
    console.log(`   CID:         ${cid}`);
    console.log(`   Gateway URL: ${gatewayUrl}`);

    // Step 4: Verify gateway helper consistency
    const expectedGatewayUrl = getGatewayUrl(cid);
    assert(gatewayUrl === expectedGatewayUrl, 'Gateway URL does not match getGatewayUrl helper');
    console.log(`   ✔ Gateway helper URL verified.`);

    // Step 5: Fetch the uploaded file back from the Pinata gateway
    console.log('\n[Step 4] Fetching file back from Pinata Gateway URL...');
    console.log(`   GET ${gatewayUrl}`);

    // Allow retry in case gateway has initial propagation latency
    let fetchResponse;
    let fetchedBytes;
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fetchResponse = await fetch(gatewayUrl);
        if (fetchResponse.ok) {
          const arrayBuffer = await fetchResponse.arrayBuffer();
          fetchedBytes = Buffer.from(arrayBuffer);
          break;
        }
      } catch (err) {
        console.log(`   Attempt ${attempt} error: ${err.message}. Retrying in 2s...`);
      }
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    assert(fetchResponse && fetchResponse.ok, `Failed to retrieve file from gateway (status: ${fetchResponse?.status})`);
    console.log(`   HTTP Status:       ${fetchResponse.status} ${fetchResponse.statusText}`);
    console.log(`   Retrieved Size:    ${fetchedBytes.length} bytes`);

    // Step 6: Recompute SHA-256 hash of fetched bytes and compare
    console.log('\n[Step 5] Recomputing SHA-256 hash of fetched bytes...');
    const fetchedSha256 = computeSha256(fetchedBytes);
    console.log(`   Fetched SHA-256:  ${fetchedSha256}`);
    console.log(`   Original SHA-256: ${localSha256}`);

    assert(fetchedBytes.length === samplePdfBuffer.length, 'Retrieved byte length does not match uploaded length');
    assert(fetchedSha256 === localSha256, 'Retrieved SHA-256 hash does not match original upload hash');

    console.log('\n====================================================');
    console.log('🎉 PINATA INTEGRATION TEST PASSED SUCCESSFULLY!');
    console.log('   - File uploaded to Pinata via pinata.upload.public.file()');
    console.log(`   - CID generated: ${cid}`);
    console.log(`   - HTTPS Gateway URL working: ${gatewayUrl}`);
    console.log('   - Retrieved file matches original SHA-256 byte-for-byte');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
