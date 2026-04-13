import { expect, test } from '@playwright/test';

test('runs complete 3D lemmings-inspired control flow and reaches terminal mission state', async ({
  page,
}) => {
  test.setTimeout(120000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown error'}`);
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /godmode lemmings 3d lab/i })).toBeVisible();
  await expect(page.getByTestId('metric-state')).toContainText(/ready/i);

  await page.getByRole('button', { name: /start mission/i }).click();
  await expect(page.getByTestId('metric-state')).toContainText(/running/i);

  await page.getByRole('button', { name: /speed 2x/i }).click();
  await expect(page.getByTestId('metric-speed')).toContainText(/2x/i);

  await page.getByRole('button', { name: /quality ultra/i }).click();
  await expect(page.getByTestId('metric-quality')).toContainText(/ultra/i);

  await page.getByRole('button', { name: /select next lemming/i }).click();
  await expect(page.getByTestId('metric-selected')).toContainText(/#/i);

  await page.getByRole('button', { name: /skill: builder/i }).click();
  await expect(page.getByTestId('metric-skill')).toContainText(/builder/i);

  await page.getByRole('button', { name: /assign selected skill/i }).click();
  await expect(page.getByTestId('status-banner')).toContainText(/builder|selected|remaining|falling/i);

  await page.getByRole('button', { name: /run math validation/i }).click();
  await expect(page.getByTestId('metric-math-validation')).toContainText(/pass|fail/i);

  await page.getByRole('button', { name: /toggle grid/i }).click();
  await page.getByRole('button', { name: /toggle atmosphere/i }).click();
  await page.getByRole('button', { name: /toggle agents/i }).click();
  await page.getByRole('button', { name: /toggle audio/i }).click();
  await page.getByRole('button', { name: /toggle hud/i }).click();
  await page.getByRole('button', { name: /toggle high contrast/i }).click();

  await page.getByRole('button', { name: /toggle hud/i }).click();
  await page.getByRole('button', { name: /next level/i }).click();
  await expect(page.getByTestId('metric-level')).toContainText(/canyon relay/i);

  await page.getByRole('button', { name: /restart level/i }).click();
  await expect(page.getByTestId('metric-state')).toContainText(/ready|running/i);
  await page.getByRole('button', { name: /start mission/i }).click();
  await page.getByRole('button', { name: /speed 4x/i }).click();

  await expect.poll(async () => {
    const text = (await page.getByTestId('metric-state').textContent()) ?? '';
    return /won|lost/i.test(text);
  }, { timeout: 35000 }).toBeTruthy();

  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();

  await page.screenshot({
    path: 'test-results/lemmings-3d-final-smoke.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
