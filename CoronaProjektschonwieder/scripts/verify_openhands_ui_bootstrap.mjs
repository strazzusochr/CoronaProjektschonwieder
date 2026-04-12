import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const evidenceDir = path.join(repoRoot, ".godmode_runtime", "evidence");
const openhandsUrl = process.env.OPENHANDS_URL || "http://127.0.0.1:3000";
const now = new Date().toISOString();
const stamp = now.replaceAll(":", "-").replaceAll(".", "-");

fs.mkdirSync(evidenceDir, { recursive: true });

const screenshotPath = path.join(
  evidenceDir,
  `openhands_ui_${stamp}.png`
);
const reportPath = path.join(
  evidenceDir,
  `openhands_ui_bootstrap_${stamp}.json`
);
const latestPath = path.join(evidenceDir, "openhands_ui_bootstrap_latest.json");

const markerPatterns = [
  "ai provider configuration",
  "custom model",
  "base url",
  "api key",
  "configure your llm",
];

const result = {
  checked_at: now,
  openhands_url: openhandsUrl,
  screenshot: screenshotPath,
  status: "NOT VERIFIED",
  provider_modal_detected: null,
  matched_markers: [],
  body_excerpt: "",
  error: "",
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(openhandsUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const bodyText = ((await page.textContent("body")) || "").toLowerCase();
  const matched = markerPatterns.filter((item) => bodyText.includes(item));
  const providerModalDetected = matched.length > 0;

  await page.screenshot({ path: screenshotPath, fullPage: true });

  result.provider_modal_detected = providerModalDetected;
  result.matched_markers = matched;
  result.body_excerpt = bodyText.slice(0, 1000);
  result.status = providerModalDetected ? "BLOCKED" : "PASS";
} catch (error) {
  result.status = "BLOCKED";
  result.error = String(error);
} finally {
  if (browser) {
    await browser.close();
  }
}

fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(latestPath, JSON.stringify(result, null, 2), "utf-8");

process.stdout.write(`${JSON.stringify(result)}\n`);
