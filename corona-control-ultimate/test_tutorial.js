
import puppeteer from 'puppeteer';

(async () => {
    console.log('=== TUTORIAL SYSTEM VERIFICATION ===');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('Tutorial')) {
            console.log('[TUTORIAL]', msg.text());
        }
    });

    try {
        // Clear localStorage to trigger tutorial
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.removeItem('tutorialCompleted'));
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));

        // Start Game
        console.log('[1] Starting New Game...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('NEUES SPIEL'));
            if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 3000));

        // Check if Tutorial appeared
        console.log('[2] Checking for Tutorial UI...');
        const tutorialVisible = await page.evaluate(() => {
            return document.body.innerText.includes('Willkommen') || 
                   document.body.innerText.includes('Tutorial') ||
                   document.body.innerText.includes('📚');
        });

        console.log(`Tutorial UI Visible: ${tutorialVisible ? 'YES ✓' : 'NO ✗'}`);

        if (tutorialVisible) {
            // Click "Weiter" to advance tutorial
            console.log('[3] Advancing Tutorial...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('Weiter'));
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 1000));

            // Test WASD for step 2
            console.log('[4] Testing WASD step...');
            await page.keyboard.press('w');
            await new Promise(r => setTimeout(r, 1000));

            // Advance again
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('Weiter'));
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('[5] Tutorial System Test Complete!');
        console.log('Keeping browser open for 15s...');
        await new Promise(r => setTimeout(r, 15000));

    } catch (e) {
        console.error('TEST FAILED:', e);
    }

    await browser.close();
})();
