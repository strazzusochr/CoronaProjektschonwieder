
import puppeteer from 'puppeteer';

(async () => {
    console.log('--- PERFORMANCE & MOVEMENT TEST (The 20m Walk) ---');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    
    // FPS Counter Injection
    await page.evaluateOnNewDocument(() => {
        window.fpsHistory = [];
        let lastTime = performance.now();
        
        function loop() {
            const now = performance.now();
            const delta = now - lastTime;
            lastTime = now;
            const fps = 1000 / delta;
            
            if (window.fpsHistory.length > 200) window.fpsHistory.shift();
            window.fpsHistory.push(fps);
            
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    });

    try {
        console.log('Loading Game...');
        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 5000)); // Wait for assets

        // Start Game
        console.log('Starting Game Session...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('NEUES SPIEL') || b.innerText.includes('Neues Spiel'));
            if(btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 3000)); // Wait for World Load

        // MOVEMENT PATTERN: 20m Box
        // Approx speed ~5m/s -> 4s duration per leg
        
        // 1. FORWARD (20m)
        console.log('>>> MOVING FORWARD (20m)');
        await page.keyboard.down('w');
        await new Promise(r => setTimeout(r, 4000));
        await page.keyboard.up('w');
        await new Promise(r => setTimeout(r, 500)); // Stabilize

        // 2. BACKWARD (20m)
        console.log('>>> MOVING BACKWARD (20m)');
        await page.keyboard.down('s');
        await new Promise(r => setTimeout(r, 4000));
        await page.keyboard.up('s');
        await new Promise(r => setTimeout(r, 500));

        // 3. RIGHT (20m)
        console.log('>>> MOVING RIGHT (20m)');
        await page.keyboard.down('d');
        await new Promise(r => setTimeout(r, 4000));
        await page.keyboard.up('d');
        await new Promise(r => setTimeout(r, 500));

        // 4. LEFT (20m)
        console.log('>>> MOVING LEFT (20m)');
        await page.keyboard.down('a');
        await new Promise(r => setTimeout(r, 4000));
        await page.keyboard.up('a');
        await new Promise(r => setTimeout(r, 500));

        // Analyze FPS
        const fpsStats = await page.evaluate(() => {
            if (!window.fpsHistory || window.fpsHistory.length === 0) return { avg: 0, min: 0 };
            const sum = window.fpsHistory.reduce((a, b) => a + b, 0);
            const avg = sum / window.fpsHistory.length;
            const min = Math.min(...window.fpsHistory);
            return { avg, min };
        });

        console.log(`--- RESULTS ---`);
        console.log(`AVG FPS: ${fpsStats.avg.toFixed(1)}`);
        console.log(`MIN FPS: ${fpsStats.min.toFixed(1)}`);

        // Screenshot with FPS Overlay
        await page.evaluate((fps) => {
             const div = document.createElement('div');
             div.style.position = 'absolute';
             div.style.top = '10px';
             div.style.left = '50%';
             div.style.transform = 'translateX(-50%)';
             div.style.fontSize = '40px';
             div.style.color = 'lime';
             div.style.fontWeight = 'bold';
             div.style.zIndex = '9999';
             div.innerText = `PERFORMANCE PROOF: ${fps.toFixed(1)} FPS`;
             document.body.appendChild(div);
        }, fpsStats.avg);

        await page.screenshot({ path: 'proof_performance_20m.png' });
        console.log('Proof saved: proof_performance_20m.png');

    } catch (e) {
        console.error('TEST FAILED:', e);
    }
    
    await browser.close();
})();
