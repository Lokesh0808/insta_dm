/**
 * Instaflow — visual regression capture.
 *
 * Requires Playwright (not a project dependency):
 *   npm i -D playwright && npx playwright install chromium
 *
 * Usage:
 *   BASE_URL=http://localhost OUT_DIR=./shots node scripts/screenshot.js
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost';
const OUT = process.env.OUT_DIR || '/tmp/shots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  const shot = async (name, path, opts = {}) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (opts.action) await opts.action();
    await page.waitForTimeout(opts.wait ?? 1200);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
    console.log(`  ✓ ${name} → ${OUT}/${name}.png`);
  };

  console.log('Capturing public pages…');
  await shot('01-landing', '/', { wait: 2000 });
  await shot('02-features', '/features');
  await shot('03-pricing', '/pricing');

  console.log('Capturing auth pages…');
  await shot('04-login', '/login');
  await shot('05-register', '/register');

  console.log('Signing in…');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'demo@instaflow.local');
  await page.fill('#password', 'Demo@12345');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForTimeout(2500);

  console.log('Capturing dashboard pages…');
  await shot('06-dashboard-overview', '/dashboard', { wait: 2500 });
  await shot('07-instagram', '/dashboard/instagram', { wait: 1800 });
  await shot('08-automations', '/dashboard/automations', { wait: 1800 });
  await shot('09-conversations', '/dashboard/conversations', { wait: 1800 });
  await shot('10-leads', '/dashboard/leads', { wait: 1800 });
  await shot('11-link-in-bio', '/dashboard/link-in-bio', { wait: 1800 });
  await shot('12-analytics', '/dashboard/analytics', { wait: 2500 });
  await shot('13-subscription', '/dashboard/subscription', { wait: 2000 });
  await shot('14-settings', '/dashboard/settings', { wait: 1500 });

  // Automation builder
  await page.goto(`${BASE}/dashboard/automations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const editLink = await page.$('text=Demo — Pricing keyword reply');
  if (editLink) {
    await editLink.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/15-automation-builder.png` });
    console.log(`  ✓ 15-automation-builder → ${OUT}/15-automation-builder.png`);

    // Switch to the workflow tab
    const flowTab = await page.$('text=Workflow builder');
    if (flowTab) {
      await flowTab.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/16-workflow-canvas.png` });
      console.log(`  ✓ 16-workflow-canvas → ${OUT}/16-workflow-canvas.png`);
    }
  }

  // Mobile viewport
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: `${OUT}/17-mobile-landing.png` });
  console.log(`  ✓ 17-mobile-landing → ${OUT}/17-mobile-landing.png`);

  await mobilePage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await mobilePage.fill('#email', 'demo@instaflow.local');
  await mobilePage.fill('#password', 'Demo@12345');
  await mobilePage.click('button[type=submit]');
  await mobilePage.waitForTimeout(3500);
  await mobilePage.screenshot({ path: `${OUT}/18-mobile-dashboard.png` });
  console.log(`  ✓ 18-mobile-dashboard → ${OUT}/18-mobile-dashboard.png`);

  // Light mode
  const light = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lightPage = await light.newPage();
  await lightPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(2000);
  await lightPage.evaluate(() => {
    const raw = localStorage.getItem('instaflow.theme');
    localStorage.setItem('instaflow.theme', JSON.stringify({ state: { theme: 'light', resolvedTheme: 'light' }, version: 0 }));
  });
  await lightPage.reload({ waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(2500);
  await lightPage.screenshot({ path: `${OUT}/19-light-mode.png` });
  console.log(`  ✓ 19-light-mode → ${OUT}/19-light-mode.png`);

  await browser.close();

  if (errors.length) {
    console.log('\nBrowser errors detected:');
    for (const error of [...new Set(errors)]) console.log('  ' + error);
  } else {
    console.log('\nNo browser console errors.');
  }
})();
