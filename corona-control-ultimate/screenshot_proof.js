
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('AI Browser Agent: Starting Gameplay Verification...');
  
  const browser = await puppeteer.launch({
    headless: false, // User wants to WATCH
    slowMo: 100, // Slow down actions to be visible
    defaultViewport: null, // Full window size
    args: [
        '--start-maximized',
        '--no-sandbox', 
        '--disable-setuid-sandbox',
    ]
  });
  
  const page = await browser.newPage();
  
  // Capture Browser Console
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  page.on('error', err => console.log('PAGE CRASH:', err.toString()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));

  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('Navigating to game...');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Navigation warning (might be ok)...');
  }

  // Find & Click Start Button
  console.log('Looking for Main Menu...');
  try {
    await page.waitForSelector('button', { timeout: 5000 });
    
    // Evaluate to find specific button
    const started = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(b => b.textContent && b.textContent.includes('Neues Spiel'));
        if (startBtn) {
            startBtn.click();
            return true;
        }
        return false;
    });

    if (started) {
        console.log('Clicked "Neues Spiel" button.');
    } else {
        console.log('Could not find "Neues Spiel" button.');
    }

  } catch (e) {
    console.log('Error finding buttons:', e.message);
  }

  // Wait for Gameplay
  console.log('Waiting for HUD (Gameplay)...');
  try {
    // Look for Health text
    await page.waitForFunction(() => {
        return document.body.innerText.includes('GESUNDHEIT:');
    }, { timeout: 10000 });
    console.log('HUD detected! Game started.');
    
    // Wait a bit for 3D scene
    await new Promise(r => setTimeout(r, 2000));
    
  } catch (e) {
    console.log('HUD not found within timeout. Maybe game setup failed?');
  }

  // Take screenshot
  const screenshotPath = path.resolve('hyper_proof_gameplay.png');
  await page.screenshot({ path: screenshotPath });
  
  console.log(`Gameplay Proof saved to: ${screenshotPath}`);
  
  await browser.close();
})();
