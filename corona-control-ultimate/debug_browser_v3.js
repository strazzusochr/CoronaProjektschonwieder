
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const logFile = path.resolve('browser_report.txt');
  const log = (msg) => {
      console.log(msg);
      fs.appendFileSync(logFile, msg + '\n');
  };

  fs.writeFileSync(logFile, '--- BROWSER DEBUG REPORT ---\n');

  log('Launching Browser...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => log(`[CONSOLE ${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => log(`[PAGE CRASH]: ${err.toString()}`));
  page.on('requestfailed', req => log(`[NETWORK FAIL]: ${req.url()} (${req.failure().errorText})`));

  try {
      log('Navigating to localhost:3000...');
      await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
      
      log('Page loaded. Waiting 5s...');
      await new Promise(r => setTimeout(r, 5000));

      const diagnosis = await page.evaluate(() => {
          const root = document.getElementById('root');
          return {
              rootInner: root ? root.innerHTML.length : 0,
              canvas: !!document.querySelector('canvas')
          };
      });
      log('DIAGNOSIS: ' + JSON.stringify(diagnosis));

  } catch (e) {
      log('SCRIPT ERROR: ' + e.toString());
  }

  log('Closing in 5s...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
