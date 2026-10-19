import { expect, test } from '@playwright/test'

test('homepage renders primary call to action', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /see roadsmith in action|open the demo/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /see the next move/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /hosted review path/i })).toHaveAttribute('href', /roadsmith-phi\.vercel\.app\/demo\/operator-review/)
})
