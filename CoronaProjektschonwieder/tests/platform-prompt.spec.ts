import { expect, test } from '@playwright/test';

test('executes a real prompt from the all-in-one homepage and shows agent evidence', async ({ page }) => {
  test.setTimeout(240000);
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/favicon.ico') || url.includes('/apple-touch-icon.png')) {
      return;
    }
    const failureText = request.failure()?.errorText ?? 'unknown error';
    const expectedPollingAbort =
      failureText.includes('ERR_ABORTED') &&
      (
        url.includes('http://127.0.0.1:3901/control-center/state') ||
        url.includes('http://127.0.0.1:3901/autonomy/capabilities') ||
        url.includes('http://127.0.0.1:3901/autonomy/profiles')
      );
    if (expectedPollingAbort) {
      return;
    }
    requestFailures.push(`${request.method()} ${url} :: ${failureText}`);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /godmode superbrain control center/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /platform connection/i })).toBeVisible();

  await page.getByLabel(/dispatch hub api url/i).fill('http://127.0.0.1:3901');
  await page.getByLabel(/openhands ui url/i).fill('http://127.0.0.1:3000');
  await page.getByRole('button', { name: /save connection/i }).click();
  await expect(page.getByText(/saved connection targets/i)).toBeVisible();

  await page.getByRole('button', { name: /test hub connection/i }).click();
  await expect(page.getByText(/hub connection test http 200/i)).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /refresh checks/i }).click();
  await expect(page.getByText(/checks complete/i)).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.status-banner').filter({ hasText: /prompt ready:\s*yes/i }).first()).toBeVisible({
    timeout: 30000,
  });

  const profileSelector = page.getByLabel(/prompt agent profile selector/i);
  const profileOptions = await profileSelector.locator('option').allTextContents();
  const artifactProfile = profileOptions.find((option) => /3d artifact builder/i.test(option));
  if (artifactProfile) {
    await profileSelector.selectOption({ label: artifactProfile });
  }

  await page.getByLabel(/prompt command/i).fill(
    'Homepage E2E smoke: create a tiny cloud-safe 3D web world artifact with a sky, ground plane, three objects, camera notes, and test evidence. Keep it small.'
  );
  await page.getByRole('button', { name: /execute prompt with autonomous agents/i }).click();

  await expect(page.getByText(/prompt response http 200/i)).toBeVisible({ timeout: 190000 });
  await expect(page.getByRole('heading', { name: /agent live activity monitor/i })).toBeVisible();
  await expect(page.getByText(/run .+ status/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/step 1:/i)).toBeVisible({ timeout: 15000 });

  await page.screenshot({
    path: 'test-results/platform-prompt-agent-evidence.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
});
