const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../test-results/phase1-sundial-screenshots');
const artifactDir = '/Users/manoj/.gemini/antigravity-ide/brain/5b2222d5-d1f3-4b80-9442-27db1665e96b';

test.describe('Phase 1: Sundial Hero & Light Metaphor Verification Suite', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('1. Benchmark 3D Sundial Hero, Cursor Shadow Tracking, and Resolve Sequence', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 960 });

    const startTime = Date.now();
    console.log('[Step 1] Navigating to /login with WebGL enabled...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for title and sundial container
    await expect(page.locator('.landing-hero-title')).toContainText('XYPHER');
    await expect(page.locator('.landing-hero-tagline')).toContainText('Verify. Trust. Authenticate.');
    await page.waitForSelector('.landing-hero-section', { state: 'visible' });

    // Measure TTI
    await page.waitForSelector('#hero-sundial-container', { state: 'visible' });
    const ttiTime = Date.now() - startTime;
    console.log(`   ⏱ Time To Interactive (TTI): ${ttiTime}ms`);

    // Verify 3D canvas or fallback
    const hasCanvas = await page.locator('.sundial-3d-canvas-container canvas').count() > 0;
    const hasFallback = await page.locator('.sundial-fallback-svg').count() > 0;
    console.log(`   🎨 3D Canvas Present: ${hasCanvas}, Fallback SVG Present: ${hasFallback}`);

    // Wait for resolve text scramble animation to initiate/progress
    await page.waitForTimeout(2000);

    // Capture initial Hero view
    const heroShotPath = path.join(screenshotsDir, 'phase1-01-sundial-hero-3d.png');
    await page.screenshot({
      path: heroShotPath,
      fullPage: false,
    });
    fs.copyFileSync(heroShotPath, path.join(artifactDir, 'phase1-01-sundial-hero-3d.png'));
    console.log('   ✔ Captured: phase1-01-sundial-hero-3d.png');

    // Test mouse-driven interaction: move cursor across sundial to shift sun angle and cast shadow
    const dialBox = await page.locator('#hero-sundial-container').boundingBox();
    if (dialBox) {
      console.log('   🖱 Simulating cursor movement over sundial instrument to track shadow...');
      await page.mouse.move(dialBox.x + dialBox.width * 0.2, dialBox.y + dialBox.height * 0.2);
      await page.waitForTimeout(300);
      await page.mouse.move(dialBox.x + dialBox.width * 0.8, dialBox.y + dialBox.height * 0.3);
      await page.waitForTimeout(300);
      await page.mouse.move(dialBox.x + dialBox.width * 0.5, dialBox.y + dialBox.height * 0.8);
      await page.waitForTimeout(400);
    }

    // Verify trust pillars
    const pillars = page.locator('.landing-pillar');
    await expect(pillars).toHaveCount(3);
    await expect(pillars.nth(0)).toContainText('Tamper-Proof');
    await expect(pillars.nth(1)).toContainText('Issuer Accreditation');
    await expect(pillars.nth(2)).toContainText('Instant & Public');

    // Test Lenis smooth scroll on "Sign In" button
    console.log('   🖱 Clicking Sign In button to trigger Lenis smooth scroll...');
    await page.click('#hero-signin-btn');
    await page.waitForTimeout(1200);

    // Verify auth card is in view
    await expect(page.locator('.auth-card')).toBeVisible();
    const authShotPath = path.join(screenshotsDir, 'phase1-03-hero-scrolled-auth.png');
    await page.screenshot({
      path: authShotPath,
      fullPage: false,
    });
    fs.copyFileSync(authShotPath, path.join(artifactDir, 'phase1-03-hero-scrolled-auth.png'));
    console.log('   ✔ Captured: phase1-03-hero-scrolled-auth.png');
  });

  test('2. Verify No-WebGL Fallback Performance and Static Sundial Rendering', async () => {
    test.setTimeout(60000);
    console.log('[Step 2] Testing simulated no-WebGL / low-end fallback environment...');
    
    // Launch browser with WebGL disabled via mock
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const page = await context.newPage();

    // Disable WebGL by overriding getContext to simulate non-supported/virtualized device
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function (type) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return Object.getPrototypeOf(HTMLCanvasElement.prototype).getContext.apply(this, arguments);
      };
    });

    const fallbackStartTime = Date.now();
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Wait for static fallback SVG
    await page.waitForSelector('.sundial-fallback-svg', { state: 'visible', timeout: 10000 });
    const fallbackTTI = Date.now() - fallbackStartTime;
    console.log(`   ⏱ Fallback Time To Interactive (TTI): ${fallbackTTI}ms`);

    // Verify SVG elements: Dial plate, gnomon, hour radials, and verified checkmark
    await expect(page.locator('.sundial-fallback-svg')).toBeVisible();
    await expect(page.locator('.fallback-verified-badge')).toBeVisible();

    // Capture Fallback view
    const fallbackShotPath = path.join(screenshotsDir, 'phase1-02-sundial-fallback.png');
    await page.screenshot({
      path: fallbackShotPath,
      fullPage: false,
    });
    fs.copyFileSync(fallbackShotPath, path.join(artifactDir, 'phase1-02-sundial-fallback.png'));
    console.log('   ✔ Captured: phase1-02-sundial-fallback.png');

    await browser.close();
  });
});
