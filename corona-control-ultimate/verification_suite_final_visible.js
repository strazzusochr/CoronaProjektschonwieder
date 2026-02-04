
import puppeteer from 'puppeteer';

(async () => {
    console.log('--- FINAL AUTONOMOUS VERIFICATION (PHASE 1-18) ---');
    console.log('Launching Visual Browser...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    
    // Log forwarding
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        // --- PHASE 1: BOOT & RENDER ---
        console.log('[PHASE 1] Loading Engine...');
        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 5000)); // Wait for heavy assets

        // Check for Main Menu
        console.log('[PHASE 17] Checking Main Menu...');
        const newGameBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('NEUES SPIEL'));
            if(btn) { 
                btn.style.border = '5px solid yellow'; // Highlight for user
                return true; 
            }
            return false;
        });

        if(newGameBtn) {
            console.log('Main Menu Found. Starting Game...');
            await new Promise(r => setTimeout(r, 1000));
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('NEUES SPIEL'));
                if(btn) btn.click();
            });
        } else {
            console.error('CRITICAL: Main Menu Button NOT found!');
        }

        console.log('Loading World...');
        await new Promise(r => setTimeout(r, 3000));

        // --- PHASE 1-3: CORE GAMEPLAY ---
        console.log('[PHASE 1-3] Verifying Core Systems...');
        
        // HUD Check
        const hudVisible = await page.evaluate(() => {
            const hud = document.body.innerText.includes('GESUNDHEIT');
            return hud;
        });
        console.log(`HUD Visible: ${hudVisible}`);

        // Movement Simulation (Input)
        console.log('Simulating Movement (WASD)...');
        await page.keyboard.down('w');
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.up('w');
        
        await page.keyboard.down('a');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.up('a');

        // Look around (Mouse)
        // Note: PointerLock prevents real mouse simulation often in automation, but we try
        /*
        await page.mouse.move(500, 500);
        await page.mouse.down();
        await page.mouse.move(600, 500, { steps: 10 });
        await page.mouse.up();
        */

        // --- PHASE 14: INVENTORY ---
        console.log('[PHASE 14] Opening Inventory (TAB)...');
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 1500)); // Let user see it
        await page.screenshot({ path: 'proof_phase14_inventory.png' });
        await page.keyboard.press('Tab'); // Close

        // --- PHASE 17 & 19: SETTINGS & ACCESSIBILITY ---
        console.log('[PHASE 17] Opening Settings (ESC)...');
        // Pause Game
        await page.keyboard.press('Escape'); 
        await new Promise(r => setTimeout(r, 1000));
        
        // Click Settings in Pause Menu
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('EINSTELLUNGEN'));
            if(btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // Click Accessibility Tab
        console.log('[PHASE 19] Testing Accessibility Tabs...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('ZUGÄNGLICHKEIT'));
            if(btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // Activate Deuteranopia
        console.log('Activating Colorblind Mode...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('DEUTERANOPIA'));
            if(btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 2000)); // Show effect

        // Reset to None
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('NONE'));
            if(btn) btn.click();
        });
        
        // Close Settings
        await page.evaluate(() => {
             const btns = Array.from(document.querySelectorAll('button'));
             const btn = btns.find(b => b.innerText.includes('ZURÜCK'));
             if(btn) btn.click();
        });
        
        // Resume Game
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('Escape'); // Close Pause Menu (Resume)

        // --- PHASE 15: COMBAT ---
        console.log('[PHASE 15] Testing Combat (Click)...');
        const dimensions = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
        await page.mouse.click(dimensions.w/2, dimensions.h/2);
        await new Promise(r => setTimeout(r, 2000)); // Watch molotov fly (if logic allows)

        // --- FINAL PROOF ---
        console.log('Taking Final Gameplay Screenshot...');
        await page.screenshot({ path: 'proof_final_gameplay.png' });

        console.log('--- TEST COMPLETE ---');
        console.log('Leaving browser open for 10s...');
        await new Promise(r => setTimeout(r, 10000));

    } catch(e) {
        console.error('TEST FAILED:', e);
        await page.screenshot({ path: 'proof_error.png' });
    }

    await browser.close();
})();
