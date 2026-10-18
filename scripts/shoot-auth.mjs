import { chromium } from 'playwright';
const browser = await chromium.launch();
// Try authenticating via the demo-login API then visiting /school-admin with the session cookie
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Run against a local server started with `npm run dev`.
const baseUrl = process.env.DEMO_BASE_URL || 'http://localhost:3000';
await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

// Try demo-login API directly from page context
const result = await page.evaluate(async () => {
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '0000', email: 'demo-operator@example.com' })
  });
  return { status: res.status, body: await res.text() };
});
console.log('demo-login result:', result.status, result.body.slice(0, 200));

// Try common admin URLs to see if anything renders
for (const path of ['/school-admin', '/dashboard', '/school-admin/students', '/school-admin/sessions']) {
  try {
    const resp = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `/tmp/playwright-captures/admin-${path.replace(/\//g,'-')}-1440.png` });
    console.log(`${path} -> HTTP ${resp?.status()}`);
  } catch (e) { console.log(`FAIL ${path}: ${e.message}`); }
}

await browser.close();
