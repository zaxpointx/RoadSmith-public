import { expect, test } from '@playwright/test'

test('homepage explains the product and links to the demo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/front desk/i)
  await expect(page.getByRole('link', { name: /text the demo school/i }).first()).toHaveAttribute('href', '/sandbox')
  await expect(page.getByRole('heading', { name: /rules it can.t talk its way around/i })).toBeVisible()
})
