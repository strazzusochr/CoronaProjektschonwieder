/**
 * scripts/check_assets.js
 * Validates asset sizes against defined budgets
 * Compatible with ESM (Node.js 20+)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUDGETS = {
    WASM_MAX_SIZE: process.env.MAX_WASM_SIZE_MB || 10,
    GLB_MAX_SIZE: 5, // 5MB limit for single assets
};

const ASSETS_DIR = path.join(__dirname, '../public/assets');

console.log("🔍 Checking asset sizes against budgets...");

function checkDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`📁 Assets directory not found at ${dir}. Skipping checks.`);
        return;
    }

    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        const sizeMB = stats.size / (1024 * 1024);

        if (file.endsWith('.wasm')) {
            console.log(`- WASM [${file}]: ${sizeMB.toFixed(2)}MB (Budget: ${BUDGETS.WASM_MAX_SIZE}MB)`);
            if (sizeMB > BUDGETS.WASM_MAX_SIZE) {
                console.error(`❌ ERROR: WASM asset ${file} exceeds budget!`);
                process.exit(1);
            }
        } else if (file.endsWith('.glb')) {
            console.log(`- GLB [${file}]: ${sizeMB.toFixed(2)}MB (Budget: ${BUDGETS.GLB_MAX_SIZE}MB)`);
            if (sizeMB > BUDGETS.GLB_MAX_SIZE) {
                console.error(`❌ ERROR: GLB asset ${file} exceeds budget!`);
                process.exit(1);
            }
        }
    });
}

checkDirectory(ASSETS_DIR);
console.log("✅ Asset checks passed!");
