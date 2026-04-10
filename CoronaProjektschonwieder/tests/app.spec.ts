import { expect, test } from '@playwright/test';

test('renders the mission UI without browser errors', async ({ page }) => {
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
      name: /corona v4/i,
    })
  ).toBeVisible();
  await expect(page.getByText(/browser smoke-tested/i)).toBeVisible();
  const activateSceneButton = page.getByRole('button', {
    name: /activate 3d scene/i,
  });
  await expect(activateSceneButton).toBeVisible();
  await activateSceneButton.click();
  await expect(page.getByText(/viewport online/i)).toBeVisible();
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
    path: 'test-results/browser-smoke.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
  expect(responseFailures).toEqual([]);
});
