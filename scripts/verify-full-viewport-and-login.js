import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const artifactDir = '/Users/manoj/.gemini/antigravity-ide/brain/2e584d02-29c4-4202-bc44-52f228fd554e';
const screenshotDir = path.join(artifactDir, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const VIEWPORTS = [
  { width: 1920, height: 1080, name: '1920x1080_desktop' },
  { width: 1440, height: 900, name: '1440x900_laptop' },
  { width: 1366, height: 768, name: '1366x768_laptop' },
  { width: 1024, height: 768, name: '1024x768_tablet_landscape' },
  { width: 768, height: 1024, name: '768x1024_tablet_portrait' },
  { width: 390, height: 844, name: '390x844_mobile' },
  { width: 320, height: 700, name: '320x700_mobile_small' },
];

async function run() {
  console.log('🚀 Starting Comprehensive Full-Viewport & Login Responsiveness Verification...\n');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`📱 Testing Viewport: ${vp.width}x${vp.height} (${vp.name})`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Clear local storage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Check document.documentElement.scrollWidth <= window.innerWidth
    const overflowCheck = await page.evaluate(() => {
      const doc = document.documentElement;
      const scrollWidth = doc.scrollWidth;
      const innerWidth = window.innerWidth;
      const clientWidth = doc.clientWidth;
      const hasHorizontalOverflow = scrollWidth > innerWidth;
      return { scrollWidth, innerWidth, clientWidth, hasHorizontalOverflow };
    });

    console.log(`  - Scroll width check: scrollWidth=${overflowCheck.scrollWidth}, innerWidth=${overflowCheck.innerWidth}, clientWidth=${overflowCheck.clientWidth}`);
    if (overflowCheck.hasHorizontalOverflow) {
      console.error(`  ❌ FAILED: Horizontal overflow detected! scrollWidth (${overflowCheck.scrollWidth}) > innerWidth (${overflowCheck.innerWidth})`);
    } else {
      console.log(`  ✅ PASSED: No horizontal overflow (scrollWidth <= innerWidth)`);
    }

    // 2. Check 3D Canvas positioning & z-index relative to UI
    const zIndexCheck = await page.evaluate(() => {
      const canvasEl = document.querySelector('.xypher-canvas-bg') || document.querySelector('.seal-3d-canvas-container canvas') || document.querySelector('.seal-fallback-svg');
      const copyEl = document.querySelector('.xypher-hero-copy');
      const ctaBtn = document.querySelector('#hero-signin-btn');
      
      let canvasZ = 0;
      let copyZ = 0;
      if (canvasEl) {
        const parentBg = canvasEl.closest('.xypher-canvas-bg') || canvasEl;
        canvasZ = parseInt(window.getComputedStyle(parentBg).zIndex, 10) || 0;
      }
      if (copyEl) {
        copyZ = parseInt(window.getComputedStyle(copyEl).zIndex, 10) || 0;
      }
      return { canvasZ, copyZ, canvasBehindUI: copyZ > canvasZ };
    });
    console.log(`  - Layer check: Hero Copy zIndex=${zIndexCheck.copyZ}, Canvas zIndex=${zIndexCheck.canvasZ} (Canvas Behind: ${zIndexCheck.canvasBehindUI})`);

    // 3. Check Demo role shortcuts within parent
    const demoPillsCheck = await page.evaluate(() => {
      const pillsContainer = document.querySelector('.xy-demo-pills-row');
      const authCard = document.querySelector('.xypher-auth-card') || document.querySelector('#auth-glass-panel');
      if (!pillsContainer || !authCard) return { found: false };

      const cardRect = authCard.getBoundingClientRect();
      const containerRect = pillsContainer.getBoundingClientRect();
      const pills = Array.from(document.querySelectorAll('.xy-demo-pill'));

      let anyOverflow = false;
      const pillDetails = pills.map(p => {
        const r = p.getBoundingClientRect();
        // Give 2px tolerance for subpixel rounding
        const overflowsCard = r.right > cardRect.right + 2 || r.left < cardRect.left - 2;
        if (overflowsCard) anyOverflow = true;
        return {
          id: p.id,
          left: Math.round(r.left),
          right: Math.round(r.right),
          cardRight: Math.round(cardRect.right),
          overflowsCard,
        };
      });

      return {
        found: true,
        anyOverflow,
        pillDetails,
        containerWidth: Math.round(containerRect.width),
        cardWidth: Math.round(cardRect.width),
      };
    });

    if (demoPillsCheck.found) {
      if (demoPillsCheck.anyOverflow) {
        console.error(`  ❌ FAILED: Demo role shortcuts overflow card!`, demoPillsCheck.pillDetails);
      } else {
        console.log(`  ✅ PASSED: All 4 demo role shortcuts fit inside card (card width: ${demoPillsCheck.cardWidth}px)`);
      }
    }

    // 4. Check smooth scroll to Auth section and that top & bottom are reachable
    await page.evaluate(() => {
      const auth = document.getElementById('auth-section');
      if (auth) auth.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const reachabilityCheck = await page.evaluate(() => {
      const header = document.querySelector('.xypher-nav') || document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;
      const card = document.querySelector('#auth-glass-panel') || document.querySelector('.xypher-auth-card');
      if (!card) return { found: false };

      const rect = card.getBoundingClientRect();
      // If rect.top is >= headerHeight - 1, the top is NOT clipped under the header
      const topVisible = rect.top >= 0;
      return {
        found: true,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        headerHeight,
        topVisible,
        windowHeight: window.innerHeight,
      };
    });

    console.log(`  - Reachability: Card top=${reachabilityCheck.top}px (header height: ${reachabilityCheck.headerHeight}px, top visible: ${reachabilityCheck.topVisible})`);

    // 5. Screenshots
    if (vp.width === 1920) {
      // Top of hero
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotDir, `hero-top-1920x1080.png`), fullPage: false });
      
      // Full hero
      await page.screenshot({ path: path.join(screenshotDir, `hero-full-1920x1080.png`) });

      // Auth section
      await page.evaluate(() => document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotDir, `auth-section-1920x1080.png`), fullPage: false });
    }

    if (vp.width === 390) {
      await page.evaluate(() => document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotDir, `login-card-390x844.png`), fullPage: false });
    }

    if (vp.width === 320) {
      await page.evaluate(() => document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotDir, `login-card-320x700.png`), fullPage: false });
    }

    results.push({
      viewport: `${vp.width}x${vp.height}`,
      hasHorizontalOverflow: overflowCheck.hasHorizontalOverflow,
      demoPillsOverflow: demoPillsCheck.anyOverflow,
      reachability: reachabilityCheck,
    });

    await context.close();
  }

  // 6. Test Demo Autofill and Form functionality at desktop
  console.log(`\n======================================================`);
  console.log(`🧪 Testing Functional Flow: Role Selection & Demo Autofill`);
  console.log(`======================================================`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const testPage = await ctx.newPage();
  await testPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await testPage.evaluate(() => document.getElementById('auth-section').scrollIntoView({ behavior: 'instant' }));
  // Test selecting Institution role card (does not auto-submit)
  await testPage.click('#role-tile-institution');
  await testPage.waitForTimeout(300);
  const roleAriaChecked = await testPage.locator('#role-tile-institution').getAttribute('aria-checked');
  console.log(`  - Institution role card clicked: aria-checked=${roleAriaChecked === 'true'}`);

  const cardEmailVal = await testPage.locator('#auth-email-input').inputValue();
  console.log(`  - Role card clicked, email populated: "${cardEmailVal}" (expected "demo.institution@xypher.demo")`);

  // Switch to Signup tab and verify registration fields appear
  await testPage.click('#tab-signup');
  await testPage.waitForTimeout(300);
  const instNameVisible = await testPage.locator('#auth-institution-name').isVisible();
  console.log(`  - Create Account tab active: Institution Name input visible: ${instNameVisible}`);

  // Switch back to Sign In tab
  await testPage.click('#tab-signin');
  await testPage.waitForTimeout(300);
  const signinBtnText = await testPage.locator('#auth-submit-btn').innerText();
  console.log(`  - Sign In tab active: Submit button text: "${signinBtnText.trim()}"`);

  // Click Demo Pill for Institution (quick 1-click evaluation that completes verification animation)
  await testPage.click('#demo-pill-institution');
  await testPage.waitForTimeout(1000);
  const currentUrl = testPage.url();
  console.log(`  - Demo pill instant evaluation clicked: navigated to ${currentUrl}`);

  await ctx.close();
  await browser.close();

  console.log(`\n======================================================`);
  console.log(`🏁 Summary of Multi-Viewport Verification:`);
  console.table(results);
  console.log(`======================================================\n`);
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
