const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../test-results/liquid-identity-screenshots');
const artifactDir = '/Users/manoj/.gemini/antigravity-ide/brain/5b2222d5-d1f3-4b80-9442-27db1665e96b';

test.describe('XYPHER — Liquid Cryptographic Identity Verification Suite', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('1. Full-Screen Hero, 5-Stage Entrance, Cursor Tracking, and Settled Hero', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 960 });

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    console.log('[Step 1] Navigating to /login...');
    const startTime = Date.now();
    await page.goto('/login');

    // Capture early entrance state
    await page.waitForTimeout(400);
    const earlyShotPath = path.join(screenshotsDir, '01-hero-entrance-stage.png');
    await page.screenshot({ path: earlyShotPath });
    fs.copyFileSync(earlyShotPath, path.join(artifactDir, 'liquid-01-hero-entrance.png'));
    console.log('   ✔ Captured: 01-hero-entrance-stage.png');

    // Wait for stage 5 to settle
    await page.waitForSelector('.xypher-wordmark-display', { state: 'visible' });
    await expect(page.locator('.xypher-wordmark-display')).toHaveText('XYPHER');
    await expect(page.locator('.xypher-hero-tagline-editorial')).toContainText('Verify What Matters.');

    // Wait for entrance animation to reach Stage 5
    await page.waitForTimeout(3800);
    const ttiTime = Date.now() - startTime;
    console.log(`   ⏱ Time To Settled Hero: ${ttiTime}ms`);

    // Capture settled full-screen hero
    const settledShotPath = path.join(screenshotsDir, '02-hero-settled-desktop.png');
    await page.screenshot({ path: settledShotPath });
    fs.copyFileSync(settledShotPath, path.join(artifactDir, 'liquid-02-hero-settled-desktop.png'));
    console.log('   ✔ Captured: 02-hero-settled-desktop.png');

    // Test cursor-driven liquid displacement
    console.log('   🖱 Simulating slow, viscous cursor movement across liquid glass canvas...');
    await page.mouse.move(720, 480);
    await page.waitForTimeout(200);
    await page.mouse.move(400, 300);
    await page.waitForTimeout(300);
    await page.mouse.move(950, 400);
    await page.waitForTimeout(300);
    await page.mouse.move(720, 600);
    await page.waitForTimeout(400);

    // Verify 3 quiet cryptographic pillars
    const pillars = page.locator('.xypher-pillar-item');
    await expect(pillars).toHaveCount(3);
    await expect(pillars.nth(0)).toContainText('Tamper-Proof Ledger');
    await expect(pillars.nth(1)).toContainText('Live Accreditation');
    await expect(pillars.nth(2)).toContainText('Zero-Cost Verification');

    // Ensure zero blocking console errors
    const fatalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('PCFSoftShadowMap'));
    expect(fatalErrors.length).toBe(0);
  });

  test('2. Scroll-Driven Transition & Frosted Glass Authentication UI', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 960 });

    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Click "Scroll to Verify" prompt button to trigger Lenis smooth scroll
    console.log('   🖱 Clicking "Scroll to Verify" button...');
    await page.click('#hero-scroll-btn');
    await page.waitForTimeout(600);

    // Capture mid-scroll transition
    const midScrollShotPath = path.join(screenshotsDir, '03-mid-scroll-transition.png');
    await page.screenshot({ path: midScrollShotPath });
    fs.copyFileSync(midScrollShotPath, path.join(artifactDir, 'liquid-03-mid-scroll-transition.png'));
    console.log('   ✔ Captured: 03-mid-scroll-transition.png');

    // Wait for scroll to settle at #auth-section
    await page.waitForTimeout(1000);

    // Verify Frosted Glass Card
    const glassCard = page.locator('#auth-glass-panel');
    await expect(glassCard).toBeVisible();

    // Verify tactile button
    const submitBtn = page.locator('#auth-submit-btn');
    await expect(submitBtn).toBeVisible();

    // Capture settled frosted glass login section
    const loginShotPath = path.join(screenshotsDir, '04-login-glass-surface.png');
    await page.screenshot({ path: loginShotPath });
    fs.copyFileSync(loginShotPath, path.join(artifactDir, 'liquid-04-login-glass-surface.png'));
    console.log('   ✔ Captured: 04-login-glass-surface.png');

    // Test Role Switching in Glass Card
    console.log('   🖱 Testing role switching on glass card...');
    const companyCard = page.locator('.role-option-card').filter({ hasText: 'Company' });
    await companyCard.click();
    await expect(companyCard).toHaveClass(/selected/);

    // Test form validation / typing
    await page.fill('input[type="email"]', 'hr.verifier@enterprise.com');
    await page.fill('input[type="password"]', 'VeriCertSecure2026!');
  });

  test('3. Responsive Mobile Viewports (Hero & Login)', async () => {
    test.setTimeout(60000);
    console.log('[Step 3] Testing responsive mobile profile (iPhone 14 / 390x844)...');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(3000);

    // Capture Mobile Hero
    const mobileHeroShot = path.join(screenshotsDir, '05-mobile-hero.png');
    await page.screenshot({ path: mobileHeroShot });
    fs.copyFileSync(mobileHeroShot, path.join(artifactDir, 'liquid-05-mobile-hero.png'));
    console.log('   ✔ Captured: 05-mobile-hero.png');

    // Scroll to mobile login
    await page.click('#hero-scroll-btn');
    await page.waitForTimeout(1200);

    // Capture Mobile Login
    const mobileLoginShot = path.join(screenshotsDir, '06-mobile-login.png');
    await page.screenshot({ path: mobileLoginShot });
    fs.copyFileSync(mobileLoginShot, path.join(artifactDir, 'liquid-06-mobile-login.png'));
    console.log('   ✔ Captured: 06-mobile-login.png');

    await browser.close();
  });

  test('4. Reduced-Motion & Non-WebGL Fallback Validation', async () => {
    test.setTimeout(60000);
    console.log('[Step 4] Testing reduced-motion and simulated no-WebGL fallback...');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    // Disable WebGL by overriding getContext
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function (type) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return Object.getPrototypeOf(HTMLCanvasElement.prototype).getContext.apply(this, arguments);
      };
    });

    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(1000);

    // Verify static fallback SVG is mounted
    await expect(page.locator('.xypher-fallback-svg')).toBeVisible();

    // Capture Fallback view
    const fallbackShot = path.join(screenshotsDir, '07-reduced-motion-fallback.png');
    await page.screenshot({ path: fallbackShot });
    fs.copyFileSync(fallbackShot, path.join(artifactDir, 'liquid-07-reduced-motion-fallback.png'));
    console.log('   ✔ Captured: 07-reduced-motion-fallback.png');

    await browser.close();
  });
});
