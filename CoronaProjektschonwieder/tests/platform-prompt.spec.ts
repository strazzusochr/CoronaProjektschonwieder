import { expect, test } from '@playwright/test';
import {
  attachRuntimeIssueCollector,
  attachScreenshotEvidence,
  expectNoHorizontalOverflow,
  expectNoRuntimeIssues,
  gotoApp,
  mockDispatchHubApi,
} from './browser-gates';

test('@mock commander exposes core prompt and run controls', async ({ page }, testInfo) => {
  test.setTimeout(120000);

  await mockDispatchHubApi(page);
  const runtimeCollector = attachRuntimeIssueCollector(page);
  runtimeCollector.setScope('commander-prompt');

  await gotoApp(page, '/?window=commander&session=e2e-sync-2');
  const runtimeCheckpoint = runtimeCollector.mark();

  await expect(page.getByRole('heading', { name: 'Commander', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /dispatch starten/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /autonomous run starten/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /retry letzter schritt/i })).toBeVisible();

  await page.getByLabel(/dispatch hub api url/i).fill('http://127.0.0.1:3901');
  await page.getByLabel(/openhands ui url/i).fill('http://127.0.0.1:3000');
  await page.getByRole('button', { name: /save connection/i }).click();

  await expect(page.getByText(/saved connection targets|hub auto-check/i)).toBeVisible({ timeout: 15000 });
  await expectNoHorizontalOverflow(page, 'commander-prompt');
  await attachScreenshotEvidence(page, testInfo, 'commander-prompt');
  expectNoRuntimeIssues(runtimeCollector.since(runtimeCheckpoint), 'commander-prompt');
});
