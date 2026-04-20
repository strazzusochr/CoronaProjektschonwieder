import { expect, test } from '@playwright/test';
import {
  attachRuntimeIssueCollector,
  attachScreenshotEvidence,
  expectNoHorizontalOverflow,
  expectNoRuntimeIssues,
  gotoApp,
} from './browser-gates';

test('@mock webgl-client route keeps renderer, camera, and input flow stable', async ({ page }, testInfo) => {
  test.setTimeout(180000);

  const runtimeCollector = attachRuntimeIssueCollector(page);
  runtimeCollector.setScope('webgl-client');
  await page.setViewportSize({ width: 1440, height: 1000 });

  await gotoApp(page, '/?window=webgl-client');
  const runtimeCheckpoint = runtimeCollector.mark();

  await expect(page.getByRole('heading', { name: /godmode lemmings 3d lab/i })).toBeVisible();
  await expect(page.getByText(/mission in standby/i)).toBeVisible();

  await page.getByRole('button', { name: /start mission/i }).click();
  await expect(page.getByTestId('client-metric-state')).toContainText(/running|won|lost/i);

  await page.getByRole('button', { name: /speed 2x/i }).click();
  await expect(page.getByTestId('client-metric-speed')).toContainText(/2x/i);

  await page.getByRole('button', { name: /quality ultra/i }).click();
  await expect(page.getByTestId('client-metric-quality')).toContainText(/ultra/i);

  await page.getByRole('button', { name: /select next lemming/i }).click();
  await expect(page.getByTestId('client-metric-selected')).toContainText(/#/i);

  await page.getByRole('button', { name: /assign selected skill/i }).click();
  await expect(page.getByTestId('client-status-banner')).toContainText(
    /builder|floater|selected|active|failed|won|lost/i,
  );

  await page.getByRole('button', { name: /reset camera/i }).click();
  await expect(page.getByTestId('client-status-banner')).toContainText(/camera reset/i);

  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();

  await page.getByRole('button', { name: /toggle grid/i }).click();
  await page.getByRole('button', { name: /toggle atmosphere/i }).click();
  await page.getByRole('button', { name: /toggle agents/i }).click();
  await page.getByRole('button', { name: /run math validation/i }).click();
  await expect(page.getByTestId('client-metric-math-validation')).toContainText(/pass|fail/i);

  await expectNoHorizontalOverflow(page, 'webgl-client');
  await attachScreenshotEvidence(page, testInfo, 'webgl-client');
  expectNoRuntimeIssues(runtimeCollector.since(runtimeCheckpoint), 'webgl-client');
});
