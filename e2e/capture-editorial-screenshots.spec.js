const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../test-results/editorial-screenshots');

test.describe('Premium Dark Editorial Visual Inspection', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Capture all four dashboards and all three verification outcome states', async ({ page }) => {
    test.setTimeout(90000);

    // Set high-res viewport for editorial clarity
    await page.setViewportSize({ width: 1440, height: 960 });

    // ---------------------------------------------------------------------------------
    // 1. REGULATOR DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[1/7] Capturing Regulator Dashboard...');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'regulator');
    });
    await page.goto('/regulator');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-regulator')).toBeVisible();
    await page.waitForTimeout(1000); // Allow Fraunces and Inter fonts to render

    await page.screenshot({
      path: path.join(screenshotsDir, '01-regulator-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 01-regulator-dashboard.png');

    // ---------------------------------------------------------------------------------
    // 2. INSTITUTION DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[2/7] Capturing Institution Dashboard...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'institution');
    });
    await page.goto('/institution');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1.dashboard-title')).toContainText('Credential Issuance & Records Portal', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, '02-institution-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 02-institution-dashboard.png');

    // ---------------------------------------------------------------------------------
    // 3. STUDENT DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[3/7] Capturing Student Dashboard...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'student');
    });
    await page.goto('/student');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-student')).toBeVisible();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, '03-student-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 03-student-dashboard.png');

    // ---------------------------------------------------------------------------------
    // 4. COMPANY DASHBOARD (Search Interface)
    // ---------------------------------------------------------------------------------
    console.log('[4/7] Capturing Company Dashboard Query Interface...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'company');
    });
    await page.goto('/company');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-company')).toBeVisible();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '04-company-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 04-company-dashboard.png');

    // ---------------------------------------------------------------------------------
    // 5. HERO VERIFICATION RESULT: VALID & ACCREDITED (Green --accent-valid)
    // ---------------------------------------------------------------------------------
    console.log('[5/7] Capturing Hero Result: VALID State (CRED-116392-U05L)...');
    await page.fill('#verification-credential-input', 'CRED-116392-U05L');
    await page.click('#verify-submit-btn');

    const validCard = page.locator('#outcome-valid-card');
    await expect(validCard).toBeVisible({ timeout: 15000 });
    await expect(validCard.locator('.outcome-pill.pill-valid')).toBeVisible();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '05-verification-valid.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 05-verification-valid.png');

    // ---------------------------------------------------------------------------------
    // 6. HERO VERIFICATION RESULT: UNACCREDITED ISSUER (Amber --accent-unaccredited)
    // ---------------------------------------------------------------------------------
    console.log('[6/7] Capturing Hero Result: UNACCREDITED State (CRED-276418-VUFV)...');
    await page.fill('#verification-credential-input', 'CRED-276418-VUFV');
    await page.click('#verify-submit-btn');

    const unaccreditedCard = page.locator('#outcome-unaccredited-card');
    await expect(unaccreditedCard).toBeVisible({ timeout: 15000 });
    await expect(unaccreditedCard.locator('.outcome-pill.pill-warning')).toBeVisible();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '06-verification-unaccredited.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 06-verification-unaccredited.png');

    // ---------------------------------------------------------------------------------
    // 7. HERO VERIFICATION RESULT: REVOKED CREDENTIAL (Red --accent-revoked)
    // ---------------------------------------------------------------------------------
    console.log('[7/7] Capturing Hero Result: REVOKED State (CRED-564817-ZVKW)...');
    await page.fill('#verification-credential-input', 'CRED-564817-ZVKW');
    await page.click('#verify-submit-btn');

    const revokedCard = page.locator('#outcome-revoked-card');
    await expect(revokedCard).toBeVisible({ timeout: 15000 });
    await expect(revokedCard.locator('.outcome-pill.pill-revoked')).toBeVisible();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '07-verification-revoked.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 07-verification-revoked.png');
    console.log('\n✨ All 7 premium dark editorial screenshots captured successfully!');
  });
});
