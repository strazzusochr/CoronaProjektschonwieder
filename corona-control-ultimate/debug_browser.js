
import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  console.log('DEBUG AGENT: Starting Visible Browser with Software Rendering...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
        '--start-maximized',
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--use-gl=swiftshader', // Software rendering usually fixes "white screen" on VMs/Remote
        '--enable-webgl',
        '--ignore-gpu-blocklist'
    ]
  });
  
  const page = await browser.newPage();
  
  // 1. Check GPU Status
  console.log('Checking chrome://gpu...');
  try {
      await page.goto('chrome://gpu', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 2000)); // Let user see it
  } catch(e) { console.log('Could not load chrome://gpu'); }

  // 2. Load Game
  console.log('Loading Game (localhost:3000)...');
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });

  console.log('Page loaded. Checking Canvas...');
  
  // Inject visual border to prove DOM is alive
  await page.evaluate(() => {
      document.body.style.border = '5px solid red';
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.border = '5px solid green';
  });

  // Attempt to start game automatically
  try {
    const btn = await page.waitForSelector('button', { timeout: 3000 });
    if (btn) {
        console.log('Button found, attempting click...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const start = buttons.find(b => b.innerText.includes('NEUES SPIEL') || b.innerText.includes('Neues Spiel'));
            if(start) start.click();
        });
    }
  } catch(e) { console.log('Start button check skipped/failed'); }

  console.log('Keeping browser open for 30s for user inspection...');
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
})();
