import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const p of ['/', '/pricing', '/login', '/signup']) {
  const r = await page.goto(`https://roadsmith.vercel.app${p}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/verify-live-${p.replace(/\//g,'-') || 'home'}.png` });
  console.log(`${p} -> HTTP ${r?.status()}`);
}
await browser.close();
