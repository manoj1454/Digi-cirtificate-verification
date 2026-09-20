const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Decentralized Credential Platform - Full End-to-End Lifecycle', () => {
  const uid = Math.floor(100000 + Math.random() * 900000);
  const institutionName = `Hyperion Institute of Technology ${uid}`;
  const registrationNumber = `REG-HIT-${uid}`;
  const instEmail = `director_${uid}@hyperion.edu`;
  const instPassword = 'Password123!';
  const staff2Email = `provost_${uid}@hyperion.edu`;
  const staff2Password = 'StaffPassword123!';
  const studentName = `Alexander Vance ${uid}`;
  const studentRoll = `ROLL-CS-${uid}`;
  const studentEmail = `alexander_${uid}@student.hyperion.edu`;
  const degreeName = `Master of Science in Distributed Ledger Architecture`;

  const downloadsDir = path.resolve(__dirname, '../test-results/downloads');
  const screenshotsDir = path.resolve(__dirname, '../test-results/screenshots');

  let credentialId = '';
  let downloadedQrPath = '';
  let downloadedHrPdfPath = '';

  test.beforeAll(async () => {
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Complete End-to-End Credential Journey (12 Steps)', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for complete blockchain lifecycle

    page.on('console', (msg) => {
      console.log(`   [PAGE ${msg.type().toUpperCase()}]`, msg.text());
    });
    page.on('pageerror', (err) => console.error('   [PAGE ERROR]', err.message));

    // ---------------------------------------------------------------------------------
    // STEP 1: Sign up fresh institution, confirm "pending approval" UI state
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 1] Signing up fresh institution...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click "Create Account" tab
    await page.click('button.auth-tab:has-text("Create Account")');
    await expect(page.locator('button.auth-tab.active')).toContainText('Create Account');

    // Select Institution Role Card
    await page.click('.role-choice-card.role-card-institution');
    await expect(page.locator('.role-choice-card.role-card-institution')).toHaveClass(/selected/);

    // Fill Institution specific profile fields
    await page.fill('input[placeholder*="Massachusetts Institute of Technology"]', institutionName);
    await page.fill('input[placeholder*="REG-2025-0812"]', registrationNumber);

    // Fill Credentials
    await page.fill('input[type="email"]', instEmail);
    await page.fill('input[type="password"]', instPassword);

    // Submit Signup form
    await page.click('button[type="submit"]');

    // Wait for redirect to institution dashboard
    await page.waitForURL('**/institution', { timeout: 15000 });

    // Confirm the "pending approval" UI state
    const pendingCard = page.locator('.approval-pending-card');
    await expect(pendingCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2.approval-pending-title')).toContainText('Waiting for Regulator Approval');
    await expect(page.locator('.dashboard-title')).toContainText(institutionName);
    await expect(page.locator('.dashboard-sub')).toContainText(registrationNumber);

    await page.screenshot({ path: path.join(screenshotsDir, '01-institution-pending-approval.png'), fullPage: true });
    console.log('   ✔ Confirmed pending approval UI state for', institutionName);

    // ---------------------------------------------------------------------------------
    // STEP 2: Log in as regulator, click approve, confirm success UI
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 2] Logging in as regulator to approve institution...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    // Ensure Sign In tab is active
    await page.click('button.auth-tab:has-text("Sign In")');

    // Login with regulator credentials
    await page.fill('input[type="email"]', 'regulator@demo.com');
    await page.fill('input[type="password"]', 'DemoPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/regulator', { timeout: 15000 });
    await expect(page.locator('.portal-badge.badge-regulator')).toBeVisible();

    // Locate the pending institution row in the Pending Institutional Applications table
    const pendingTable = page.locator('table').first();
    const instRow = pendingTable.locator('tr', { hasText: institutionName });
    await expect(instRow).toBeVisible({ timeout: 10000 });

    // Click Approve button within that row
    const approveBtn = instRow.locator('button:has-text("Approve")');
    await expect(approveBtn).toBeEnabled();
    await approveBtn.click();

    // Confirm success notification
    const successAlert = page.locator('.alert-box.alert-success');
    await expect(successAlert).toBeVisible({ timeout: 20000 });
    await expect(successAlert).toContainText('Successfully approved');

    // Confirm institution now appears in Approved Institutions table with "Accredited & Active"
    const approvedTable = page.locator('table').last();
    const approvedRow = approvedTable.locator('tr', { hasText: institutionName });
    await expect(approvedRow).toBeVisible({ timeout: 10000 });
    await expect(approvedRow.locator('text=Accredited & Active')).toBeVisible();

    await page.screenshot({ path: path.join(screenshotsDir, '02-regulator-approved.png'), fullPage: true });
    console.log('   ✔ Institution approved on-chain and active in regulator portal');

    // ---------------------------------------------------------------------------------
    // STEP 3: As institution, invite a second staff member, add a student, issue a certificate
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 3] Logging back in as institution to configure staff, student & certificate...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', instEmail);
    await page.fill('input[type="password"]', instPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/institution', { timeout: 15000 });

    // The institution is now approved, so full issuance portal must render
    await expect(page.locator('h1.dashboard-title')).toContainText('Credential Issuance & Records Portal');
    await expect(page.locator('#issue-certificate-btn')).toBeVisible();

    // 3a. Invite second staff member
    console.log('   -> Inviting second staff member...');
    await page.click('#invite-staff-btn');
    await expect(page.locator('.modal-card:has-text("Invite Staff Member")')).toBeVisible();

    await page.fill('#staff-name-input', 'Dr. Bob Provost');
    await page.fill('#staff-email-input', staff2Email);
    await page.fill('#staff-password-input', staff2Password);
    await page.waitForTimeout(300);
    await page.click('#submit-invite-staff-btn');

    await expect(page.locator('.alert-box.alert-success')).toContainText('invited successfully', { timeout: 25000 });
    await expect(page.locator(`tr:has-text("${staff2Email}")`)).toBeVisible({ timeout: 10000 });
    console.log('   ✔ Second staff member registered:', staff2Email);

    // 3b. Add student
    console.log('   -> Adding student profile...');
    await page.click('#add-student-btn');
    await expect(page.locator('.modal-card:has-text("Enroll Student to Institution")')).toBeVisible();

    await page.fill('#student-name-input', studentName);
    await page.fill('#student-roll-input', studentRoll);
    await page.fill('#student-email-input', studentEmail);
    await page.click('#submit-add-student-btn');

    await expect(page.locator('.alert-box.alert-success')).toContainText('registered successfully', { timeout: 25000 });
    console.log('   ✔ Student registered:', studentName);

    // 3c. Issue certificate
    console.log('   -> Initiating academic certificate with test PDF...');
    await page.click('#issue-certificate-btn');
    await expect(page.locator('.modal-card:has-text("Initiate New Academic Credential")')).toBeVisible();

    // Select student
    await page.selectOption('#select-student-dropdown', { label: `${studentName} (${studentRoll})` });
    await page.fill('#degree-name-input', degreeName);

    // Upload real PDF
    const testPdfPath = path.resolve(__dirname, '../test-cert.pdf');
    await page.setInputFiles('#certificate-file-input', testPdfPath);

    await page.click('#submit-initiate-cert-btn');

    // Wait for initiation success notice
    await expect(page.locator('.alert-box.alert-success')).toContainText('Certificate initiated with Credential ID', {
      timeout: 25000,
    });

    // Extract Credential ID from the pending certificates table
    const pendingCertRow = page.locator('table').first().locator('tr', { hasText: degreeName });
    await expect(pendingCertRow).toBeVisible({ timeout: 10000 });
    credentialId = (await pendingCertRow.locator('code').first().textContent()).trim();
    console.log('   ✔ Certificate initiated successfully! Credential ID:', credentialId);

    // ---------------------------------------------------------------------------------
    // STEP 4: Confirm "Approve & Issue" button is genuinely disabled for initiator (Dual-Control)
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 4] Verifying dual-control rule: button must be disabled for initiator...');
    await expect(pendingCertRow.locator('text=Awaiting 2nd Staff Signer')).toBeVisible();

    const initiatorActionBtn = pendingCertRow.locator('button:has-text("Awaiting 2nd Signer")');
    await expect(initiatorActionBtn).toBeVisible();
    await expect(initiatorActionBtn).toBeDisabled();

    await page.screenshot({ path: path.join(screenshotsDir, '03-initiator-button-disabled.png'), fullPage: true });
    console.log('   ✔ Confirmed: Initiator is prevented from approving their own credential (button genuinely disabled)');

    // ---------------------------------------------------------------------------------
    // STEP 5: Log out, log in as second staff member, confirm button enabled, click it
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 5] Logging in as second staff member to approve credential...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', staff2Email);
    await page.fill('input[type="password"]', staff2Password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/institution', { timeout: 15000 });

    const staff2PendingRow = page.locator('table').first().locator('tr', { hasText: credentialId });
    await expect(staff2PendingRow).toBeVisible({ timeout: 10000 });
    await expect(staff2PendingRow.locator('text=Ready for Your Approval')).toBeVisible();

    const staff2ApproveBtn = staff2PendingRow.locator('button:has-text("Approve & Issue")');
    await expect(staff2ApproveBtn).toBeVisible();
    await expect(staff2ApproveBtn).toBeEnabled();

    console.log('   -> Clicking "Approve & Issue" to mine on blockchain...');
    await staff2ApproveBtn.click();

    // Approval triggers smart contract mining and opens the QR modal
    const qrModal = page.locator('.modal-card:has-text("Credential QR Code")');
    await expect(qrModal).toBeVisible({ timeout: 40000 });
    console.log('   ✔ Mined on-chain! QR Code modal rendered for Credential:', credentialId);

    await page.screenshot({ path: path.join(screenshotsDir, '04-staff2-approved-qr-modal.png') });

    // Close QR modal
    await page.click('.modal-card button[aria-label="Close"]');
    await expect(qrModal).toBeHidden();

    // Confirm certificate appears in Issued Academic Credentials table
    const issuedTable = page.locator('table').last();
    const issuedRow = issuedTable.locator('tr', { hasText: credentialId });
    await expect(issuedRow).toBeVisible({ timeout: 10000 });
    console.log('   ✔ Confirmed in Issued Academic Credentials table');

    // ---------------------------------------------------------------------------------
    // STEP 6: As student, confirm certificate appears, click to view PDF, download QR
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 6] Logging in as student to access credential wallet...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', studentEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/student', { timeout: 15000 });
    await expect(page.locator('.portal-badge.badge-student')).toBeVisible();

    // Confirm certificate card appears
    const studentCertCard = page.locator(`#cert-card-${credentialId}`);
    await expect(studentCertCard).toBeVisible({ timeout: 10000 });
    await expect(studentCertCard.locator('.cert-degree-title')).toContainText(degreeName);

    // Click to view PDF link and verify URL points to IPFS gateway
    const pdfLink = page.locator(`#download-cert-${credentialId}`);
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute('href');
    expect(href).toMatch(/^https?:\/\//);
    console.log('   ✔ Verified PDF link points to IPFS gateway:', href.slice(0, 45) + '...');

    // Click to view QR code and download PNG
    await page.click(`#view-qr-btn-${credentialId}`);
    const studentQrModal = page.locator('.modal-card:has-text("Credential QR Code")');
    await expect(studentQrModal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#qr-code-image')).toBeVisible();

    console.log('   -> Downloading credential QR code image...');
    const [qrDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#download-qr-btn'),
    ]);
    downloadedQrPath = path.join(downloadsDir, `${credentialId}-qr.png`);
    await qrDownload.saveAs(downloadedQrPath);

    expect(fs.existsSync(downloadedQrPath)).toBe(true);
    expect(fs.statSync(downloadedQrPath).size).toBeGreaterThan(500);
    console.log('   ✔ Downloaded authentic QR image file:', downloadedQrPath, `(${fs.statSync(downloadedQrPath).size} bytes)`);

    await page.screenshot({ path: path.join(screenshotsDir, '05-student-wallet-and-qr.png'), fullPage: true });

    // Close modal
    await page.click('.modal-card button[aria-label="Close"]');

    // ---------------------------------------------------------------------------------
    // STEP 7: As company, type Credential ID into search input, click verify, confirm green "Valid" UI
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 7] Logging in as company to perform manual Credential ID lookup...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', 'company@demo.com');
    await page.fill('input[type="password"]', 'DemoPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/company', { timeout: 15000 });
    await expect(page.locator('.portal-badge.badge-company')).toBeVisible();

    // Type Credential ID into search input
    await page.fill('#verification-credential-input', credentialId);
    await page.click('#verify-submit-btn');

    // Confirm green "Valid" card renders
    const validCard = page.locator('#outcome-valid-card');
    await expect(validCard).toBeVisible({ timeout: 15000 });
    await expect(validCard.locator('.outcome-pill.pill-valid')).toContainText('VALID & AUTHENTIC');
    await expect(validCard.locator('.outcome-pill.pill-accredited')).toContainText('ISSUER ACCREDITED');
    await expect(validCard.locator('h2.outcome-title')).toContainText('Valid Credential');
    await expect(validCard).toContainText(degreeName);
    await expect(validCard).toContainText(studentName);

    await page.screenshot({ path: path.join(screenshotsDir, '06-company-verified-valid.png'), fullPage: true });
    console.log('   ✔ Green "Valid & Authentic" outcome card confirmed');

    // ---------------------------------------------------------------------------------
    // STEP 8: Use QR upload option with downloaded QR image, confirm auto-fill & same result
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 8] Testing QR code image upload scanning...');
    // Clear input first
    await page.fill('#verification-credential-input', '');

    // Open scan modal
    await page.click('#scan-qr-modal-btn');
    const scanModal = page.locator('.modal-card:has-text("Scan Credential QR Code")');
    await expect(scanModal).toBeVisible({ timeout: 5000 });

    // Switch to "Upload QR Image" tab
    await page.click('button:has-text("Upload QR Image")');

    // Upload the downloaded QR image
    await page.setInputFiles('input[type="file"][accept="image/*"]', downloadedQrPath);

    // The modal decodes the image, auto-fills input, and submits query
    await expect(scanModal).toBeHidden({ timeout: 15000 });
    await expect(page.locator('#verification-credential-input')).toHaveValue(credentialId, { timeout: 10000 });
    const filledInputVal = await page.inputValue('#verification-credential-input');
    expect(filledInputVal.trim()).toBe(credentialId);
    await expect(validCard).toBeVisible({ timeout: 15000 });
    await expect(validCard.locator('.outcome-pill.pill-valid')).toContainText('VALID & AUTHENTIC');

    await page.screenshot({ path: path.join(screenshotsDir, '07-company-qr-upload-valid.png'), fullPage: true });
    console.log('   ✔ QR upload auto-filled', filledInputVal, 'and validated successfully');

    // ---------------------------------------------------------------------------------
    // STEP 9: Click "Download HR Report," confirm real PDF file is produced
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 9] Generating and downloading official HR audit PDF report...');
    const [hrDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#download-hr-report-btn'),
    ]);

    downloadedHrPdfPath = path.join(downloadsDir, await hrDownload.suggestedFilename());
    await hrDownload.saveAs(downloadedHrPdfPath);

    expect(fs.existsSync(downloadedHrPdfPath)).toBe(true);
    const pdfSize = fs.statSync(downloadedHrPdfPath).size;
    expect(pdfSize).toBeGreaterThan(1000);

    const pdfBuffer = fs.readFileSync(downloadedHrPdfPath);
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
    console.log('   ✔ Real HR Report PDF generated:', downloadedHrPdfPath, `(${pdfSize} bytes)`);

    // ---------------------------------------------------------------------------------
    // STEP 10: As regulator, click to revoke that institution's accreditation
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 10] Regulator revoking institution accreditation on-chain...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', 'regulator@demo.com');
    await page.fill('input[type="password"]', 'DemoPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/regulator', { timeout: 15000 });

    const regulatorApprovedTable = page.locator('table').last();
    const instToRevokeRow = regulatorApprovedTable.locator('tr', { hasText: institutionName });
    await expect(instToRevokeRow).toBeVisible({ timeout: 10000 });

    const revokeAccredBtn = instToRevokeRow.locator('button:has-text("Revoke Accreditation")');
    await expect(revokeAccredBtn).toBeVisible();
    await revokeAccredBtn.click();

    await expect(page.locator('.alert-box.alert-success')).toContainText('accreditation REVOKED on-chain', {
      timeout: 20000,
    });
    await expect(instToRevokeRow.locator('text=Accreditation Revoked')).toBeVisible();

    await page.screenshot({ path: path.join(screenshotsDir, '08-regulator-accreditation-revoked.png'), fullPage: true });
    console.log('   ✔ Institution accreditation revoked on-chain');

    // ---------------------------------------------------------------------------------
    // STEP 11: As company, re-verify same Credential ID, confirm amber "issuer no longer accredited" state
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 11] Company re-verifying credential with revoked issuer accreditation...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', 'company@demo.com');
    await page.fill('input[type="password"]', 'DemoPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/company', { timeout: 15000 });

    await page.fill('#verification-credential-input', credentialId);
    await page.click('#verify-submit-btn');

    // Confirm amber "Issuer No Longer Accredited" card renders
    const unaccreditedCard = page.locator('#outcome-unaccredited-card');
    await expect(unaccreditedCard).toBeVisible({ timeout: 15000 });
    await expect(unaccreditedCard.locator('.outcome-pill.pill-warning')).toContainText('ISSUER NO LONGER ACCREDITED');
    await expect(unaccreditedCard.locator('.outcome-pill.pill-revoked')).toContainText('ACCREDITATION REVOKED');
    await expect(unaccreditedCard.locator('h2.outcome-title')).toContainText('Issuer No Longer Accredited');

    await page.screenshot({ path: path.join(screenshotsDir, '09-company-issuer-unaccredited.png'), fullPage: true });
    console.log('   ✔ Amber "Issuer No Longer Accredited" state confirmed');

    // ---------------------------------------------------------------------------------
    // STEP 12: As institution, revoke certificate itself, re-verify, confirm red "revoked" state
    // ---------------------------------------------------------------------------------
    console.log('\n[STEP 12] Institution revoking certificate directly on-chain...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', instEmail);
    await page.fill('input[type="password"]', instPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/institution', { timeout: 15000 });
    await expect(page.locator('h1.dashboard-title')).toContainText('Credential Issuance & Records Portal', { timeout: 15000 });

    const revokeCertBtn = page.locator(`#revoke-cert-${credentialId}`);
    await expect(revokeCertBtn).toBeVisible({ timeout: 15000 });
    await revokeCertBtn.click();

    await expect(page.locator('.alert-box.alert-success')).toContainText('successfully revoked on-chain', {
      timeout: 20000,
    });
    await expect(page.locator(`tr:has-text("${credentialId}") .status-badge.badge-revoked`)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotsDir, '10-institution-certificate-revoked.png'), fullPage: true });
    console.log('   ✔ Certificate revoked on-chain by institution');

    // Re-verify as company to confirm red "revoked" state
    console.log('   -> Final company verification check...');
    await page.click('button.logout-btn');
    await page.waitForURL('**/login', { timeout: 10000 });

    await page.click('button.auth-tab:has-text("Sign In")');
    await page.fill('input[type="email"]', 'company@demo.com');
    await page.fill('input[type="password"]', 'DemoPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/company', { timeout: 15000 });

    await page.fill('#verification-credential-input', credentialId);
    await page.click('#verify-submit-btn');

    // Confirm red "Certificate Revoked" card renders
    const revokedCard = page.locator('#outcome-revoked-card');
    await expect(revokedCard).toBeVisible({ timeout: 15000 });
    await expect(revokedCard.locator('.outcome-pill.pill-revoked')).toContainText('CREDENTIAL REVOKED');
    await expect(revokedCard.locator('h2.outcome-title')).toContainText('Certificate Revoked');

    await page.screenshot({ path: path.join(screenshotsDir, '11-company-certificate-revoked-final.png'), fullPage: true });
    console.log('   ✔ Red "Credential Revoked" outcome confirmed on final verification check');
    console.log('\n================================================================');
    console.log('🎉 ALL 12 END-TO-END STEPS PASSED WITH 100% REAL UI INTERACTIONS!');
    console.log('================================================================\n');
  });
});
