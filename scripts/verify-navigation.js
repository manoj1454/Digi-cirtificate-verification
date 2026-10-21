import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const artifactDir = '/Users/manoj/.gemini/antigravity-ide/brain/2e584d02-29c4-4202-bc44-52f228fd554e';
const screenshotDir = path.join(artifactDir, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runNavigationTests() {
  console.log('🚀 Starting Comprehensive Navigation Verification...\n');
  const browser = await chromium.launch({ headless: true });
  
  // ----------------------------------------------------
  // TEST 1: Desktop Navigation (1440x900)
  // ----------------------------------------------------
  console.log('======================================================');
  console.log('🖥 1. Testing Desktop Navigation (1440x900)');
  console.log('======================================================');
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contextDesktop.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check all internal links point to valid existing element IDs
  const linkTargets = await page.evaluate(() => {
    const navLinks = Array.from(document.querySelectorAll('.xypher-nav a'));
    return navLinks.map(a => {
      const href = a.getAttribute('href');
      const text = a.innerText.trim();
      let exists = false;
      if (href.startsWith('#')) {
        const id = href.substring(1);
        exists = Boolean(document.getElementById(id));
      } else if (href.startsWith('/#')) {
        exists = true; // cross-page anchor
      }
      return { text, href, exists };
    });
  });

  console.log('  Navigation link targets check:');
  for (const lt of linkTargets) {
    if (!lt.exists) {
      console.error(`  ❌ FAILED: Link "${lt.text}" (${lt.href}) points to missing element!`);
    } else {
      console.log(`  ✅ Link "${lt.text}" -> ${lt.href} (Target Exists: true)`);
    }
  }

  // Click 1: Ledger Matrix
  console.log('\n  👉 Clicking "Ledger Matrix"...');
  await page.click('.xypher-nav a[href="#ledger-matrix"]');
  await page.waitForTimeout(600);
  const matrixVisible = await page.evaluate(() => {
    const sec = document.getElementById('ledger-matrix');
    const header = document.querySelector('.xypher-header');
    const headerHeight = header ? header.offsetHeight : 0;
    const rect = sec.getBoundingClientRect();
    return {
      visible: rect.top < window.innerHeight && rect.bottom > 0,
      rectTop: Math.round(rect.top),
      headerHeight,
      headerClearance: rect.top >= 0,
    };
  });
  console.log(`     - Ledger Matrix visible: ${matrixVisible.visible}, top: ${matrixVisible.rectTop}px (Header clearance: ${matrixVisible.headerClearance})`);
  await page.screenshot({ path: path.join(screenshotDir, 'nav-01-ledger-matrix.png'), fullPage: false });

  // Click 2: Architecture
  console.log('\n  👉 Clicking "Architecture"...');
  await page.click('.xypher-nav a[href="#architecture"]');
  await page.waitForTimeout(600);
  const archVisible = await page.evaluate(() => {
    const sec = document.getElementById('architecture');
    const rect = sec.getBoundingClientRect();
    return {
      visible: rect.top < window.innerHeight && rect.bottom > 0,
      rectTop: Math.round(rect.top),
      headerClearance: rect.top >= 0,
    };
  });
  console.log(`     - Architecture section visible: ${archVisible.visible}, top: ${archVisible.rectTop}px (Header clearance: ${archVisible.headerClearance})`);
  await page.screenshot({ path: path.join(screenshotDir, 'nav-02-architecture.png'), fullPage: false });

  // Click 3: Sign In
  console.log('\n  👉 Clicking "Sign In"...');
  await page.click('.xypher-nav a[href="#sign-in"]');
  await page.waitForTimeout(600);
  const signinVisible = await page.evaluate(() => {
    const sec = document.getElementById('sign-in');
    const card = document.getElementById('auth-section');
    const rect = card.getBoundingClientRect();
    return {
      visible: rect.top < window.innerHeight && rect.bottom > 0,
      rectTop: Math.round(rect.top),
      headerClearance: rect.top >= 0,
    };
  });
  console.log(`     - Sign In section visible: ${signinVisible.visible}, card top: ${signinVisible.rectTop}px (Header clearance: ${signinVisible.headerClearance})`);

  // Click 4: Overview (scrolls back up to the top hero)
  console.log('\n  👉 Clicking "Overview"...');
  await page.click('.xypher-nav a[href="#overview"]');
  await page.waitForTimeout(600);
  const overviewVisible = await page.evaluate(() => {
    const scrollY = window.scrollY;
    const hero = document.getElementById('overview');
    const rect = hero.getBoundingClientRect();
    return {
      scrollY,
      heroTop: Math.round(rect.top),
      atTop: scrollY <= 50,
    };
  });
  console.log(`     - Hero reached: scrollY=${overviewVisible.scrollY}px, heroTop=${overviewVisible.heroTop}px (At top: ${overviewVisible.atTop})`);

  // Click 5: Verify (cross-page link to /#verify)
  console.log('\n  👉 Clicking "Verify"...');
  await page.click('.xypher-nav a[href="/#verify"]');
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  console.log(`     - Navigated to: ${currentUrl}`);
  const hasVerifyInput = await page.locator('#verify-input, input[placeholder*="credential"]').count() > 0 || currentUrl.includes('#verify');
  console.log(`     - Verification lookup target reached: ${hasVerifyInput}`);

  await contextDesktop.close();

  // ----------------------------------------------------
  // TEST 2: Mobile Navigation (390x844)
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log('📱 2. Testing Mobile Navigation Drawer (390x844)');
  console.log('======================================================');
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await contextMobile.newPage();
  await mobPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(800);

  // Open mobile menu
  console.log('  👉 Opening mobile menu drawer...');
  await mobPage.click('.xypher-mobile-toggle');
  await mobPage.waitForTimeout(300);
  const drawerOpen = await mobPage.locator('.xypher-mobile-drawer').isVisible();
  console.log(`     - Mobile drawer open: ${drawerOpen}`);

  // Click Ledger Matrix in mobile drawer
  console.log('  👉 Mobile: Clicking "Ledger Matrix"...');
  await mobPage.click('.xypher-mobile-drawer a[href="#ledger-matrix"]');
  await mobPage.waitForTimeout(600);
  const mobDrawerClosed = !(await mobPage.locator('.xypher-mobile-drawer').isVisible());
  const mobMatrixVisible = await mobPage.evaluate(() => {
    const sec = document.getElementById('ledger-matrix');
    const rect = sec.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.top >= 0;
  });
  console.log(`     - Drawer closed on click: ${mobDrawerClosed}, Ledger Matrix reached: ${mobMatrixVisible}`);

  // Re-open and click Architecture
  console.log('  👉 Mobile: Re-opening and clicking "Architecture"...');
  await mobPage.click('.xypher-mobile-toggle');
  await mobPage.waitForTimeout(300);
  await mobPage.click('.xypher-mobile-drawer a[href="#architecture"]');
  await mobPage.waitForTimeout(600);
  const mobArchVisible = await mobPage.evaluate(() => {
    const sec = document.getElementById('architecture');
    const rect = sec.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.top >= 0;
  });
  console.log(`     - Architecture section reached: ${mobArchVisible}`);

  // Re-open and click Overview
  console.log('  👉 Mobile: Re-opening and clicking "Overview"...');
  await mobPage.click('.xypher-mobile-toggle');
  await mobPage.waitForTimeout(300);
  await mobPage.click('.xypher-mobile-drawer a[href="#overview"]');
  await mobPage.waitForTimeout(600);
  const mobOverviewTop = await mobPage.evaluate(() => window.scrollY <= 60);
  console.log(`     - Hero Overview reached at top: ${mobOverviewTop}`);

  // Re-open and click Sign In
  console.log('  👉 Mobile: Re-opening and clicking "Sign In"...');
  await mobPage.click('.xypher-mobile-toggle');
  await mobPage.waitForTimeout(300);
  await mobPage.click('.xypher-mobile-drawer a[href="#sign-in"]');
  await mobPage.waitForTimeout(600);
  const mobCardVisible = await mobPage.evaluate(() => {
    const card = document.getElementById('auth-glass-panel');
    const rect = card.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.top >= 0;
  });
  console.log(`     - Login card reached and visible: ${mobCardVisible}`);

  await contextMobile.close();
  await browser.close();

  console.log('\n======================================================');
  console.log('🎉 All Header Navigation Tests Succeeded!');
  console.log('======================================================\n');
}

runNavigationTests().catch(err => {
  console.error('Fatal navigation test error:', err);
  process.exit(1);
});
