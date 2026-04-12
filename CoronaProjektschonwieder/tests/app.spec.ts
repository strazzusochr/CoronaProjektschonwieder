import { expect, test } from '@playwright/test';

test('renders and verifies every main gameplay control without runtime errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const responseFailures: string[] = [];

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

  page.on('response', (response) => {
    const url = response.url();

    if (url.startsWith('http://127.0.0.1:4173') && response.status() >= 400) {
      responseFailures.push(`${response.status()} ${response.request().method()} ${url}`);
    }
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: /godmode arena lab/i,
    })
  ).toBeVisible();
  await expect(page.getByTestId('metric-state')).toContainText(/standby/i);

  const activateArenaButton = page.getByRole('button', {
    name: /activate 3d arena/i,
  });
  await expect(activateArenaButton).toBeVisible();
  await activateArenaButton.click();
  await expect(page.getByTestId('metric-state')).toContainText(/live/i);

  await page.getByRole('button', { name: /veteran mode/i }).click();
  await expect(page.getByTestId('metric-difficulty')).toContainText(/veteran/i);

  await page.getByRole('button', { name: /collect orb/i }).click();
  await expect(page.getByTestId('metric-score')).toContainText(/15/i);

  await page.getByRole('button', { name: /next wave/i }).click();
  await expect(page.getByTestId('metric-wave')).toContainText(/2/i);

  await page.getByRole('button', { name: /trigger hit/i }).click();
  await expect(page.getByTestId('metric-lives')).toContainText(/2/i);

  await page.getByRole('button', { name: /toggle grid/i }).click();
  await expect(page.getByTestId('metric-grid')).toContainText(/off/i);

  await page.getByRole('button', { name: /toggle atmosphere/i }).click();
  await expect(page.getByTestId('metric-atmosphere')).toContainText(/off/i);

  await page.getByRole('button', { name: /toggle auto rotate/i }).click();
  await expect(page.getByTestId('metric-rotate')).toContainText(/off/i);

  await page.getByRole('button', { name: /switch to sunset/i }).click();
  await expect(page.getByTestId('metric-theme')).toContainText(/sunset/i);

  await page.getByRole('button', { name: /pause simulation/i }).click();
  await expect(page.getByTestId('metric-state')).toContainText(/paused/i);

  await page.getByRole('button', { name: /resume simulation/i }).click();
  await expect(page.getByTestId('metric-state')).toContainText(/live/i);

  await page.getByRole('button', { name: /reset mission/i }).click();
  await expect(page.getByTestId('metric-wave')).toContainText(/1/i);
  await expect(page.getByTestId('metric-score')).toContainText(/0/i);
  await expect(page.getByTestId('metric-lives')).toContainText(/3/i);
  await expect(page.getByTestId('metric-difficulty')).toContainText(/rookie/i);
  await expect(page.getByTestId('metric-theme')).toContainText(/neon/i);

  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();

  const canvasBounds = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  });

  expect(canvasBounds.width).toBeGreaterThan(100);
  expect(canvasBounds.height).toBeGreaterThan(100);

  await page.screenshot({
    path: 'test-results/arena-controls-smoke.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
  expect(responseFailures).toEqual([]);
});
