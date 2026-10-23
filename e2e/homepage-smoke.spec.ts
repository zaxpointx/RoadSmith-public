import { expect, test } from '@playwright/test'

test('homepage renders primary call to action', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /see roadsmith in action|open the demo/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /see the decision boundary/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open operator review/i })).toHaveAttribute('href', '/demo/operator-review')
})

test('reviewer demo follows the inquiry to owner decision story', async ({ page }) => {
  await page.goto('/demo/operator-review')

  await expect(page.getByText('SYNTHETIC · NO SIDE EFFECTS')).toBeVisible()
  await expect(page.getByRole('heading', { name: /start with the question/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /a feasible lesson, not a booking/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /make the owner decision/i })).toBeVisible()
  await expect(page.locator('details')).toHaveJSProperty('open', false)

  await page.getByRole('region', { name: 'Demo controls' }).getByRole('button', { name: 'Needs information' }).click()
  await expect(page.getByText('More information needed')).toBeVisible()
  await expect(page.getByText('The intake update is not present in this scenario.')).toBeVisible()

  await page.getByRole('region', { name: 'Demo controls' }).getByRole('button', { name: 'Enough to review' }).click()
  await page.getByRole('button', { name: 'Approve locally' }).click()
  await expect(page.getByText(/owner decision: approve/i)).toBeVisible()
  await expect(page.getByText('side effects: []', { exact: true })).toBeVisible()
})

test('reviewer demo remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo/operator-review')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve locally' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
