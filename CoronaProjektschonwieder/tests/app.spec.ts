import { expect, test } from '@playwright/test';

test('renders the mission UI without browser errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: /corona v4/i,
    })
  ).toBeVisible();
  await expect(page.getByText(/browser smoke-tested/i)).toBeVisible();
  await expect(page.getByText(/viewport online/i)).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);

  await page.screenshot({
    path: 'test-results/browser-smoke.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
