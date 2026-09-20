const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../test-results/dark-theme-screenshots');

test.describe('3D Hero & Dark Theme Verification Suite', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('1. Benchmark 3D Hero Page, Mouse Lighting Interaction, and Auth Card', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 960 });

    const startTime = Date.now();
    console.log('[Step 1] Navigating to /login with WebGL enabled...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for title and 3D container
    await expect(page.locator('.landing-hero-title')).toContainText('XYPHER');
    await page.waitForSelector('.landing-hero-section', { state: 'visible' });

    // Allow 3D canvas or fallback to mount
    await page.waitForTimeout(1500);
    const ttiTime = Date.now() - startTime;

    // Check if Canvas or Fallback mounted
    const hasCanvas = await page.locator('.seal-3d-canvas-container canvas').count() > 0;
    const hasFallback = await page.locator('.seal-fallback-svg').count() > 0;
    console.log(`   ⏱ Time To Interactive (TTI): ${ttiTime}ms`);
    console.log(`   🎨 3D Canvas Present: ${hasCanvas}, Fallback SVG Present: ${hasFallback}`);

    // Capture initial Hero view
    await page.screenshot({
      path: path.join(screenshotsDir, '01-hero-3d-landing.png'),
      fullPage: false,
    });
    console.log('   ✔ Captured: 01-hero-3d-landing.png');

    // Test mouse-driven interaction: sweep cursor across canvas to trigger grazing light reveal
    const sealBox = await page.locator('#hero-seal-container').boundingBox();
    if (sealBox) {
      console.log('   🖱 Simulating mouse sweep across 3D medallion to trigger light shift...');
      await page.mouse.move(sealBox.x + sealBox.width * 0.2, sealBox.y + sealBox.height * 0.2);
      await page.waitForTimeout(300);
      await page.mouse.move(sealBox.x + sealBox.width * 0.8, sealBox.y + sealBox.height * 0.3);
      await page.waitForTimeout(300);
      await page.mouse.move(sealBox.x + sealBox.width * 0.5, sealBox.y + sealBox.height * 0.8);
      await page.waitForTimeout(400);
    }

    // Click "Sign In" button and test smooth scroll down to Auth Card
    console.log('   🖱 Clicking Sign In button to test smooth scroll...');
    await page.click('#hero-signin-btn');
    await page.waitForTimeout(1000);

    // Verify Auth Card visible in dark theme
    await expect(page.locator('.auth-card')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, '02-auth-card-dark.png'),
      fullPage: false,
    });
    console.log('   ✔ Captured: 02-auth-card-dark.png');
  });

  test('2. Simulate No-WebGL Device Fallback Path', async () => {
    console.log('[Step 2] Testing simulated No-WebGL fallback path...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });

    const page = await context.newPage();

    // Disable WebGL via context override script before page loads
    await page.addInitScript(() => {
      // Force getContext to return null for WebGL contexts
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return origGetContext.apply(this, [type, ...args]);
      };
      // Remove global WebGL context constructors
      delete window.WebGLRenderingContext;
      delete window.WebGL2RenderingContext;
    });

    const fallbackStart = Date.now();
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Confirm that the Fallback component rendered without errors
    await expect(page.locator('.seal-fallback-svg')).toBeVisible({ timeout: 10000 });
    const fallbackTTI = Date.now() - fallbackStart;
    console.log(`   ⏱ No-WebGL Fallback TTI: ${fallbackTTI}ms`);

    // Verify zero 3D canvas is created
    const canvasCount = await page.locator('.seal-3d-canvas-container canvas').count();
    expect(canvasCount).toBe(0);
    console.log('   ✔ Confirmed 0 WebGL canvases mounted. Static medallion SVG rendered seamlessly.');

    await page.screenshot({
      path: path.join(screenshotsDir, '03-hero-fallback-no-webgl.png'),
      fullPage: false,
    });
    console.log('   ✔ Captured: 03-hero-fallback-no-webgl.png');

    await browser.close();
  });

  test('3. Capture All Four Dark Dashboards', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 960 });

    // ---------------------------------------------------------------------------------
    // REGULATOR DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[Step 3.1] Capturing Regulator Dashboard...');
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'regulator');
    });
    await page.goto('/regulator');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-regulator')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '04-regulator-dark-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 04-regulator-dark-dashboard.png');

    // ---------------------------------------------------------------------------------
    // INSTITUTION DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[Step 3.2] Capturing Institution Dashboard...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'institution');
    });
    await page.goto('/institution');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1.dashboard-title')).toContainText('Credential Issuance & Records Portal', { timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '05-institution-dark-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 05-institution-dark-dashboard.png');

    // ---------------------------------------------------------------------------------
    // STUDENT DASHBOARD
    // ---------------------------------------------------------------------------------
    console.log('[Step 3.3] Capturing Student Dashboard...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'student');
    });
    await page.goto('/student');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-student')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, '06-student-dark-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 06-student-dark-dashboard.png');

    // ---------------------------------------------------------------------------------
    // COMPANY DASHBOARD & VERIFICATION SCREEN
    // ---------------------------------------------------------------------------------
    console.log('[Step 3.4] Capturing Company Dashboard & Verification Outcome...');
    await page.evaluate(() => {
      localStorage.setItem('veriCert_demo_role', 'company');
    });
    await page.goto('/company');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.portal-badge.badge-company')).toBeVisible({ timeout: 15000 });

    // Run verification check for sample credential
    const input = page.locator('.verify-input-field');
    await input.fill('CRED-077438-SNT0');
    await page.click('#verify-submit-btn');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, '07-company-dark-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✔ Captured: 07-company-dark-dashboard.png');
  });
});
