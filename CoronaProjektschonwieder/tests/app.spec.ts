import { expect, test } from '@playwright/test';
import {
  attachRuntimeIssueCollector,
  attachScreenshotEvidence,
  expectNoHorizontalOverflow,
  expectNoRuntimeIssues,
  gotoApp,
  mockDispatchHubApi,
} from './browser-gates';

const roles = [
  { window: 'commander', heading: 'Commander', requireRawJson: false },
  { window: 'glasshouse', heading: 'Glasshouse', requireRawJson: false },
  { window: 'operations', heading: 'Operations', requireRawJson: true },
] as const;

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`@mock renders synchronized windows with browser regression gates (${viewport.name})`, async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await mockDispatchHubApi(page);
    const runtimeCollector = attachRuntimeIssueCollector(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const role of roles) {
      const scope = `${viewport.name}:${role.window}`;
      runtimeCollector.setScope(scope);

      await gotoApp(page, `/?window=${role.window}&session=e2e-sync-${viewport.name}`);
      const runtimeCheckpoint = runtimeCollector.mark();

      await expect(page.getByRole('heading', { name: /transparent multi-agent developer platform/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: role.heading, exact: true })).toBeVisible();

      if (role.window === 'commander') {
        await expect(page.getByRole('button', { name: /dispatch starten/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /autonomous run starten/i })).toBeVisible();
        await expect(page.getByText(/sentineltruthagent/i).first()).toBeVisible();
        await expect(page.getByText(/sentinelruntimeagent/i).first()).toBeVisible();
      }

      if (role.window === 'glasshouse') {
        await expect(page.getByRole('heading', { name: 'Interventions', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Control Event Stream', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /retry same target/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /rollback/i })).toBeVisible();
      }

      if (role.window === 'operations') {
        await expect(page.getByRole('heading', { name: 'Service Health Grid', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Live State Probe', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /run 10-sample probe/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Routing + Bootstrap + Config Presence', exact: true })).toBeVisible();
      }

      const rawJsonHeading = page.getByRole('heading', { name: 'Raw JSON Diagnostics', exact: true });
      if (role.requireRawJson) {
        await expect(rawJsonHeading).toBeVisible();
      } else {
        await expect(rawJsonHeading).toHaveCount(0);
      }

      await expectNoHorizontalOverflow(page, scope);
      await attachScreenshotEvidence(page, testInfo, scope);
      expectNoRuntimeIssues(runtimeCollector.since(runtimeCheckpoint), scope);
    }
  });
}
