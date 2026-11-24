import { expect, test } from '@playwright/test'

// The core journey in the local sandbox: a new parent texts, books, pays; the owner sees it.
// Resets the sandbox's synthetic data first.
test('parent books and pays by text; owner sees it in the Control Center', async ({ page, request, baseURL }) => {
  test.setTimeout(120_000)
  const reset = await request.post('/api/os/sandbox/reset', { headers: { origin: baseURL! } })
  test.skip(reset.status() === 404, 'sandbox not enabled (DATABASE_URL is set)')
  await page.goto('/sandbox')
  await page.getByRole('button', { name: /New parent/ }).click()
  const send = async (text: string) => {
    await page.getByLabel('Text message').fill(text)
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('.rs-typing')).toHaveCount(0, { timeout: 30_000 })
  }
  for (const t of ['I want to book a driving lesson for my daughter', 'my daughter', 'Olivia Grant 04/02/2010', '1500 Riverside Dr, Nashville TN 37206', 'permit TN55512345']) await send(t)
  await expect(page.locator('.rs-bub--them').last()).toContainText('A)')
  await send('A')
  const link = page.locator('.rs-bub--them a').last()
  await expect(link).toHaveAttribute('href', /\/pay\//)
  await page.goto((await link.getAttribute('href'))!)
  await expect(page.getByText('Test checkout — no card is charged')).toBeVisible()
  await page.getByRole('button', { name: /Pay \$75 with a test card/ }).click()
  await expect(page.getByText(/^Paid/)).toBeVisible()

  await page.goto('/app/login')
  await page.getByRole('button', { name: 'Enter the Control Center' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening), Maya/)
  await expect(page.getByText(/Payment received: \$75/)).toBeVisible()
  await page.getByRole('link', { name: 'Conversations' }).click()
  await expect(page.getByText(/Olivia's lesson is confirmed/).first()).toBeVisible()
})

test('Control Center requires sign-in', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/app/schedule')
  await expect(page).toHaveURL(/\/app\/login/)
})
