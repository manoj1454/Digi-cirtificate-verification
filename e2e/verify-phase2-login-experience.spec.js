const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../test-results/phase2-screenshots');
const artifactDir = '/Users/manoj/.gemini/antigravity-ide/brain/5b2222d5-d1f3-4b80-9442-27db1665e96b';

test.describe('XYPHER — Phase 2: Premium Login Experience & Authentication Transition', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Ensure clean state without lingering demo session in localStorage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Complete Phase 2 Verification & Visual Suite', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 960 });

    console.log('[Step 1] Navigating to /login...');
    await page.goto('/login');
    await page.waitForSelector('#auth-glass-panel', { state: 'visible' });

    // Scroll to the auth section
    await page.evaluate(() => {
      document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(600);

    // 1. Initial State Screenshot
    console.log('   📸 1. Capturing Login Initial State...');
    const shot1 = path.join(screenshotsDir, '01-login-initial.png');
    await page.screenshot({ path: shot1 });
    fs.copyFileSync(shot1, path.join(artifactDir, 'phase2-01-login-initial.png'));

    // Verify presence of Phase 2 elements
    await expect(page.locator('#auth-glass-panel')).toBeVisible();
    await expect(page.locator('.auth-tabs-segmented')).toBeVisible();
    await expect(page.locator('.role-tiles-grid')).toBeVisible();
    await expect(page.locator('#role-tile-regulator')).toBeVisible();
    await expect(page.locator('#role-tile-institution')).toBeVisible();
    await expect(page.locator('#role-tile-student')).toBeVisible();
    await expect(page.locator('#role-tile-company')).toBeVisible();

    // 2. Role Hover Screenshot
    console.log('   📸 2. Capturing Role Hover State...');
    await page.hover('#role-tile-institution');
    await page.waitForTimeout(300);
    const shot2 = path.join(screenshotsDir, '02-role-hover.png');
    await page.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(artifactDir, 'phase2-02-role-hover.png'));

    // 3. Role Selected Screenshot
    console.log('   📸 3. Capturing Role Selected State...');
    await page.click('#role-tile-regulator');
    await page.waitForTimeout(250);
    await expect(page.locator('#role-tile-regulator')).toHaveClass(/selected/);
    const shot3 = path.join(screenshotsDir, '03-role-selected.png');
    await page.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(artifactDir, 'phase2-03-role-selected.png'));

    // 4. Input Focused Screenshot
    console.log('   📸 4. Capturing Input Focused State...');
    await page.click('#auth-email-input');
    await page.fill('#auth-email-input', 'auditor@regulator.gov');
    await page.waitForTimeout(250);
    const shot4 = path.join(screenshotsDir, '04-input-focused.png');
    await page.screenshot({ path: shot4 });
    fs.copyFileSync(shot4, path.join(artifactDir, 'phase2-04-input-focused.png'));

    // 5. Button Hover Screenshot
    console.log('   📸 5. Capturing Button Hover State...');
    await page.hover('#auth-submit-btn');
    await page.waitForTimeout(250);
    const shot5 = path.join(screenshotsDir, '05-button-hover.png');
    await page.screenshot({ path: shot5 });
    fs.copyFileSync(shot5, path.join(artifactDir, 'phase2-05-button-hover.png'));

    // 6. Button Pressed Screenshot
    console.log('   📸 6. Capturing Button Pressed State...');
    const btnBox = await page.locator('#auth-submit-btn').boundingBox();
    if (btnBox) {
      await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(150);
      const shot6 = path.join(screenshotsDir, '06-button-pressed.png');
      await page.screenshot({ path: shot6 });
      fs.copyFileSync(shot6, path.join(artifactDir, 'phase2-06-button-pressed.png'));
      await page.mouse.up();
    }

    // 7. Error Shake State
    console.log('   📸 7. Capturing Error Shake State...');
    await page.fill('#auth-password-input', 'invalid-pass-xyz');
    await page.click('#auth-submit-btn');
    await page.waitForTimeout(400);
    const shot7 = path.join(screenshotsDir, '07-error-state.png');
    await page.screenshot({ path: shot7 });
    fs.copyFileSync(shot7, path.join(artifactDir, 'phase2-07-error-state.png'));

    // 8 & 9. Authentication Success Transition (650ms)
    console.log('   📸 8 & 9. Testing Demo Authentication Success Transition...');
    const resolvePromise = page.waitForSelector('.auth-verification-resolve', { state: 'visible', timeout: 5000 });
    await page.click('#demo-pill-regulator');
    await resolvePromise;

    const shot8 = path.join(screenshotsDir, '08-auth-success-resolve.png');
    await page.screenshot({ path: shot8 });
    fs.copyFileSync(shot8, path.join(artifactDir, 'phase2-08-auth-success-resolve.png'));
    console.log('   ✔ Captured: 08-auth-success-resolve.png');

    // Wait for the 650ms transition to navigate to /regulator
    await page.waitForURL('**/regulator', { timeout: 8000 });
    await page.waitForTimeout(600);
    const shot9 = path.join(screenshotsDir, '09-dashboard-transition.png');
    await page.screenshot({ path: shot9 });
    fs.copyFileSync(shot9, path.join(artifactDir, 'phase2-09-dashboard-transition.png'));
    console.log('   ✔ Captured: 09-dashboard-transition.png');
  });

  test('Mobile Login Experience (390px)', async ({ page }) => {
    console.log('   📸 10. Testing Mobile Login Recomposition...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.waitForSelector('#auth-glass-panel', { state: 'visible' });

    await page.evaluate(() => {
      document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const shot10 = path.join(screenshotsDir, '10-mobile-login.png');
    await page.screenshot({ path: shot10 });
    fs.copyFileSync(shot10, path.join(artifactDir, 'phase2-10-mobile-login.png'));
    console.log('   ✔ Captured: 10-mobile-login.png');
  });

  test('Reduced Motion Preference Handling', async ({ page }) => {
    console.log('   📸 11. Testing Reduced Motion Preference...');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/login');
    await page.waitForSelector('#auth-glass-panel', { state: 'visible' });

    await page.evaluate(() => {
      document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const shot11 = path.join(screenshotsDir, '11-reduced-motion-login.png');
    await page.screenshot({ path: shot11 });
    fs.copyFileSync(shot11, path.join(artifactDir, 'phase2-11-reduced-motion-login.png'));
    console.log('   ✔ Captured: 11-reduced-motion-login.png');
  });

  test('Sign In / Create Account Segmented Tabs and Extra Fields', async ({ page }) => {
    console.log('   📸 12. Testing Create Account Segmented Switch & Fields...');
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/login');
    await page.waitForSelector('#auth-glass-panel', { state: 'visible' });

    await page.evaluate(() => {
      document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(400);

    // Switch to Create Account
    await page.click('#tab-signup');
    await page.waitForTimeout(300);

    // Click Institution role to reveal extra institution fields
    await page.click('#role-tile-institution');
    await page.waitForTimeout(200);

    await expect(page.locator('#auth-institution-name')).toBeVisible();
    await expect(page.locator('#auth-registration-code')).toBeVisible();

    // Click Student role to reveal extra student fields
    await page.click('#role-tile-student');
    await page.waitForTimeout(200);

    await expect(page.locator('#auth-student-name')).toBeVisible();
    await expect(page.locator('#auth-student-roll')).toBeVisible();

    const shot12 = path.join(screenshotsDir, '12-create-account-fields.png');
    await page.screenshot({ path: shot12 });
    fs.copyFileSync(shot12, path.join(artifactDir, 'phase2-12-create-account-fields.png'));
    console.log('   ✔ Captured: 12-create-account-fields.png');
  });
});
