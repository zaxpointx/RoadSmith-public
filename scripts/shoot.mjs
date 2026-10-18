import { chromium } from 'playwright';
const baseUrl = process.env.LIVE_BASE_URL || 'http://localhost:3000';
const pages = [
  ['home', `${baseUrl}/`],
  ['pricing', `${baseUrl}/pricing`],
  ['login', `${baseUrl}/login`],
  ['signup', `${baseUrl}/signup`],
  ['school-admin', `${baseUrl}/school-admin`],
  ['onboarding', `${baseUrl}/onboarding`],
  ['forgot-password', `${baseUrl}/forgot-password`],
  ['book', `${baseUrl}/book`],
];
const sizes = [['1440',1440,900],['375',375,812]];
const outDir = '/tmp/playwright-captures';
const browser = await chromium.launch();
for (const [name, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [pname, url] of pages) {
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
      const status = resp ? resp.status() : 'no-resp';
      await page.waitForTimeout(800);
      const file = `${outDir}/${pname}-${name}.png`;
      await page.screenshot({ path: file, fullPage: false });
      console.log(`${pname} ${name}px HTTP ${status} -> ${file}`);
    } catch (e) { console.log(`FAIL ${pname} ${name}px: ${e.message}`); }
  }
  await ctx.close();
}
await browser.close();
