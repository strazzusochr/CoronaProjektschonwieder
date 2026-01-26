
import puppeteer from 'puppeteer';

(async () => {
  console.log('REPAIR AGENT: Launching Diagnostic Browser...');
  console.log('User: Please watch the opened window for error messages.');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture ALL logs
  page.on('console', msg => console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[BROWSER CRASH]:', err.toString()));
  page.on('requestfailed', req => console.error(`[NETWORK FAIL]: ${req.url()} - ${req.failure().errorText}`));

  try {
      console.log('Navigating to http://localhost:3000 ...');
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      console.log('Page loaded. waiting for stability...');
      await new Promise(r => setTimeout(r, 5000));

      // Inject Diagnosis Tool into page
      const diagnosis = await page.evaluate(() => {
          const root = document.getElementById('root');
          const canvas = document.querySelector('canvas');
          const overlay = document.querySelector('div[style*="absolute"]'); // HUD or Menu
          
          return {
              rootExists: !!root,
              rootChildren: root ? root.childElementCount : 0,
              canvasExists: !!canvas,
              canvasVisible: canvas ? (canvas.width > 0 && canvas.height > 0) : false,
              overlayDetected: !!overlay,
              bodyHtml: document.body.innerHTML.slice(0, 500) // Snapshot
          };
      });

      console.log('DIAGNOSIS RESULT:', diagnosis);

  } catch (e) {
      console.error('PUPPETEER ERROR:', e);
  }

  console.log('Keeping browser open for 60 seconds for manual inspection...');
  await new Promise(r => setTimeout(r, 60000));
  
  await browser.close();
})();
