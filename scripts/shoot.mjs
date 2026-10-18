import { chromium } from 'playwright';
const pages = [
  ['home', 'https://roadsmith.vercel.app/'],
  ['pricing', 'https://roadsmith.vercel.app/pricing'],
  ['login', 'https://roadsmith.vercel.app/login'],
  ['signup', 'https://roadsmith.vercel.app/signup'],
  ['school-admin', 'https://roadsmith.vercel.app/school-admin'],
  ['onboarding', 'https://roadsmith.vercel.app/onboarding'],
  ['forgot-password', 'https://roadsmith.vercel.app/forgot-password'],
  ['book', 'https://roadsmith.vercel.app/book'],
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
