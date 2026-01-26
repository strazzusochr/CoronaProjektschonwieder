
import puppeteer from 'puppeteer';

(async () => {
    console.log('=== CORONA CONTROL ULTIMATE - FULL SYSTEM VERIFICATION ===');
    console.log('This test will run in a VISIBLE browser. Watch the screen!');
    console.log('');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    let report = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            report.push(`[ERROR] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => {
        report.push(`[CRASH] ${err.toString()}`);
    });

    try {
        // === PHASE 1: LOAD ===
        console.log('[1/10] Loading game...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // === PHASE 2: MAIN MENU CHECK ===
        console.log('[2/10] Checking Main Menu...');
        const hasMainMenu = await page.evaluate(() => {
            return document.body.innerText.includes('NEUES SPIEL') || document.body.innerText.includes('NEW GAME');
        });
        report.push(`Main Menu: ${hasMainMenu ? 'OK' : 'MISSING'}`);

        if (hasMainMenu) {
            console.log('[3/10] Starting New Game...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('NEUES SPIEL') || b.innerText.includes('NEW GAME'));
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 3000)); // Wait for game load
        }

        // === PHASE 3: CANVAS CHECK ===
        console.log('[4/10] Checking 3D Canvas...');
        const canvasExists = await page.evaluate(() => {
            const c = document.querySelector('canvas');
            return !!c && c.width > 0 && c.height > 0;
        });
        report.push(`3D Canvas: ${canvasExists ? 'OK' : 'FAIL'}`);

        // === PHASE 4: HUD CHECK ===
        console.log('[5/10] Checking HUD...');
        const hasHUD = await page.evaluate(() => {
            return document.body.innerText.includes('GESUNDHEIT') || document.body.innerText.includes('HEALTH');
        });
        report.push(`HUD Visible: ${hasHUD ? 'OK' : 'FAIL'}`);

        // === PHASE 5: MOVEMENT TEST ===
        console.log('[6/10] Testing Movement (WASD)...');
        await page.keyboard.down('w');
        await new Promise(r => setTimeout(r, 1500));
        await page.keyboard.up('w');
        await page.keyboard.down('a');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.up('a');
        await page.keyboard.down('d');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.up('d');
        await page.keyboard.down('s');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.up('s');
        report.push('Movement: WASD Keys Sent');

        // === PHASE 6: INVENTORY TEST ===
        console.log('[7/10] Testing Inventory (TAB)...');
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 1500));
        const inventoryVisible = await page.evaluate(() => {
            return document.body.innerText.includes('INVENTAR') || document.body.innerText.includes('INVENTORY');
        });
        report.push(`Inventory Open: ${inventoryVisible ? 'OK' : 'FAIL'}`);
        await page.keyboard.press('Tab'); // Close

        // === PHASE 7: PAUSE MENU TEST ===
        console.log('[8/10] Testing Pause Menu (ESC)...');
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 1000));
        const pauseMenuVisible = await page.evaluate(() => {
            return document.body.innerText.includes('FORTSETZEN') || document.body.innerText.includes('RESUME')
                || document.body.innerText.includes('PAUSIERT') || document.body.innerText.includes('PAUSED');
        });
        report.push(`Pause Menu: ${pauseMenuVisible ? 'OK' : 'FAIL'}`);

        // === PHASE 8: SETTINGS TEST ===
        if (pauseMenuVisible) {
            console.log('[9/10] Testing Settings Menu...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('EINSTELLUNGEN') || b.innerText.includes('SETTINGS'));
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 1000));
            const settingsVisible = await page.evaluate(() => {
                return document.body.innerText.includes('GRAFIK') || document.body.innerText.includes('AUDIO')
                    || document.body.innerText.includes('ZUGÄNGLICHKEIT');
            });
            report.push(`Settings Menu: ${settingsVisible ? 'OK' : 'FAIL'}`);
            
            // Close Settings
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('ZURÜCK') || b.innerText.includes('BACK'));
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 500));
        }

        // Resume Game
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 500));

        // === PHASE 9: COMBAT TEST ===
        console.log('[10/10] Testing Combat (Left Click)...');
        const centerX = await page.evaluate(() => window.innerWidth / 2);
        const centerY = await page.evaluate(() => window.innerHeight / 2);
        await page.mouse.click(centerX, centerY);
        await new Promise(r => setTimeout(r, 1500));
        report.push('Combat: Attack Sent');

        // === REPORT ===
        console.log('');
        console.log('=== VERIFICATION REPORT ===');
        report.forEach(line => console.log(line));
        console.log('===========================');
        
        const errors = report.filter(r => r.includes('ERROR') || r.includes('CRASH'));
        if (errors.length > 0) {
            console.log('');
            console.log('ERRORS DETECTED:');
            errors.forEach(e => console.log('  ' + e));
        }

        console.log('');
        console.log('Keeping browser open for 30 seconds for manual inspection...');
        console.log('(Check 3D scene, NPC movement, HUD elements)');
        await new Promise(r => setTimeout(r, 30000));

    } catch (e) {
        console.error('TEST FAILED:', e);
    }

    await browser.close();
    console.log('Browser closed. Test complete.');
})();
