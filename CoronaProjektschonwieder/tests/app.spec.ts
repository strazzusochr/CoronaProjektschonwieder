import { expect, test } from '@playwright/test';

test('runs complete 3D sandbox control flow and reaches terminal mission state', async ({
  page,
}) => {
  test.setTimeout(120000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const httpErrorResponses: string[] = [];

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
    if (response.status() >= 400) {
      httpErrorResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /godmode superbrain control center/i })).toBeVisible();
  await page.getByRole('button', { name: /open creator sandbox/i }).click();
  await expect(page.getByRole('heading', { name: /godmode 3d sandbox/i })).toBeVisible();
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

  const ignoredPlatformProbeFailures = [
    'http://127.0.0.1:3001/health',
    'http://127.0.0.1:5678/healthz',
    'http://127.0.0.1:8080/health',
    'http://127.0.0.1:3901/health',
    'http://127.0.0.1:3901/bootstrap/status',
    'http://127.0.0.1:3901/control-center/state',
    'http://127.0.0.1:3901/agents',
    'http://127.0.0.1:3901/routing/status',
    'http://127.0.0.1:3901/autonomy/profiles',
    'http://127.0.0.1:3901/autonomy/capabilities',
  ];
  const unexpectedRequestFailures = requestFailures.filter(
    (failure) => ignoredPlatformProbeFailures.every((knownFailure) => !failure.includes(knownFailure))
  );
  const ignoredHttpErrors = [
    '/favicon.ico',
    '/apple-touch-icon.png',
    'http://127.0.0.1:3901/bootstrap/status',
    'http://127.0.0.1:3901/control-center/state',
    'http://127.0.0.1:3901/autonomy/profiles',
    'http://127.0.0.1:3901/autonomy/capabilities',
  ];
  const unexpectedHttpErrors = httpErrorResponses.filter(
    (entry) => ignoredHttpErrors.every((knownError) => !entry.includes(knownError))
  );
  const unexpectedConsoleErrors = consoleErrors.filter((entry) => {
    if (!entry.includes('Failed to load resource: the server responded with a status of 404')) {
      return true;
    }
    return unexpectedHttpErrors.length > 0;
  });

  expect(pageErrors).toEqual([]);
  expect(unexpectedRequestFailures).toEqual([]);
  expect(unexpectedHttpErrors).toEqual([]);
  expect(unexpectedConsoleErrors).toEqual([]);
});
