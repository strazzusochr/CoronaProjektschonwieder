/**
 * ProceduralTextures - AAA-Quality Canvas-basierte Texturen
 * Gemäß AAA Grafik V4.0 Spezifikation
 */
import * as THREE from 'three';

// Texture Cache to avoid recreation
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Simple Perlin-like Noise (2D)
 */
function noise2D(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

/**
 * Smooth Noise with interpolation
 */
function smoothNoise(x: number, y: number, scale: number): number {
    const sx = x / scale;
    const sy = y / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;

    const n00 = noise2D(x0, y0);
    const n10 = noise2D(x0 + 1, y0);
    const n01 = noise2D(x0, y0 + 1);
    const n11 = noise2D(x0 + 1, y0 + 1);

    const nx0 = n00 * (1 - fx) + n10 * fx;
    const nx1 = n01 * (1 - fx) + n11 * fx;

    return nx0 * (1 - fy) + nx1 * fy;
}

/**
 * Multi-octave fractal noise
 */
function fractalNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += smoothNoise(x * frequency, y * frequency, 32) * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }

    return value / maxValue;
}

/**
 * Create realistic skin texture with pores and variation
 */
export function createSkinTexture(
    tone: 'light' | 'medium' | 'dark' = 'medium',
    size: number = 1024
): THREE.CanvasTexture {
    const cacheKey = `skin_${tone}_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base skin tones (RGB)
    const baseTones = {
        light: [255, 220, 185],
        medium: [230, 180, 140],
        dark: [180, 130, 90],
    };
    const [baseR, baseG, baseB] = baseTones[tone];

    // Fill with base color
    ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
    ctx.fillRect(0, 0, size, size);

    // Add multi-octave noise for organic variation
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;

            // Multi-scale noise
            const n1 = smoothNoise(x, y, 32) * 20 - 10;
            const n2 = smoothNoise(x, y, 8) * 8 - 4;
            const n3 = smoothNoise(x, y, 2) * 3 - 1.5;
            const variation = n1 + n2 + n3;

            // Pore simulation (tiny dark dots)
            const pore = Math.random() > 0.995 ? -25 : 0;

            // Freckle simulation (occasional darker spots)
            const freckle = Math.random() > 0.998 ? -15 : 0;

            data[i] = Math.max(0, Math.min(255, baseR + variation + pore + freckle));
            data[i + 1] = Math.max(0, Math.min(255, baseG + variation * 0.9 + pore + freckle));
            data[i + 2] = Math.max(0, Math.min(255, baseB + variation * 0.8 + pore + freckle));
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add reddish areas (cheeks, nose areas)
    const addBlush = (cx: number, cy: number, radius: number) => {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255, 120, 120, 0.12)');
        gradient.addColorStop(1, 'rgba(255, 120, 120, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    };

    addBlush(size * 0.25, size * 0.45, size * 0.15);
    addBlush(size * 0.75, size * 0.45, size * 0.15);
    addBlush(size * 0.5, size * 0.55, size * 0.1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create fabric texture with realistic weave pattern
 */
export function createFabricTexture(
    color: [number, number, number],
    size: number = 512
): THREE.CanvasTexture {
    const cacheKey = `fabric_${color.join('_')}_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillRect(0, 0, size, size);

    // Weave pattern (twill)
    const weaveSize = 4;
    for (let y = 0; y < size; y += weaveSize) {
        for (let x = 0; x < size; x += weaveSize) {
            const isHorizontal = (Math.floor(y / weaveSize) + Math.floor(x / weaveSize)) % 2 === 0;
            const shade = isHorizontal ? 8 : -8;
            ctx.fillStyle = `rgb(${Math.min(255, color[0] + shade)}, ${Math.min(255, color[1] + shade)}, ${Math.min(255, color[2] + shade)})`;
            ctx.fillRect(x, y, weaveSize, weaveSize);
        }
    }

    // Thread-level detail
    ctx.strokeStyle = `rgba(0,0,0,0.05)`;
    ctx.lineWidth = 0.5;
    for (let y = 0; y < size; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }
    for (let x = 0; x < size; x += 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
    }

    // Add noise for worn look
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 12;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create brick texture with mortar and weathering
 */
export function createBrickTexture(size: number = 1024): THREE.CanvasTexture {
    const cacheKey = `brick_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Mortar base
    ctx.fillStyle = 'rgb(195, 190, 180)';
    ctx.fillRect(0, 0, size, size);

    // Brick dimensions
    const brickWidth = 64;
    const brickHeight = 32;
    const mortarWidth = 5;

    for (let row = 0; row < size / brickHeight; row++) {
        const offset = (row % 2) * (brickWidth / 2);
        for (let col = -1; col < size / brickWidth + 1; col++) {
            const x = col * brickWidth + offset;
            const y = row * brickHeight;

            // Random brick color variation (terracotta tones)
            const r = 145 + Math.floor(Math.random() * 45);
            const g = 65 + Math.floor(Math.random() * 35);
            const b = 45 + Math.floor(Math.random() * 25);

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(
                x + mortarWidth / 2,
                y + mortarWidth / 2,
                brickWidth - mortarWidth,
                brickHeight - mortarWidth
            );

            // Surface texture/weathering
            for (let i = 0; i < 8; i++) {
                const nx = x + mortarWidth + Math.random() * (brickWidth - mortarWidth * 2);
                const ny = y + mortarWidth + Math.random() * (brickHeight - mortarWidth * 2);
                const weathering = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
                ctx.fillStyle = weathering;
                ctx.beginPath();
                ctx.arc(nx, ny, 1 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create asphalt texture with cracks and repairs
 */
export function createAsphaltTexture(size: number = 1024): THREE.CanvasTexture {
    const cacheKey = `asphalt_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base dark gray
    ctx.fillStyle = 'rgb(55, 55, 60)';
    ctx.fillRect(0, 0, size, size);

    // Heavy noise for aggregate texture
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const n = smoothNoise(x, y, 3) * 35 - 17.5;
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // Random repair patches
    for (let i = 0; i < 10; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const pr = 25 + Math.random() * 70;
        const shade = Math.random() > 0.5 ? 15 : -15;
        ctx.fillStyle = `rgba(${55 + shade}, ${55 + shade}, ${60 + shade}, 0.6)`;
        ctx.beginPath();
        ctx.ellipse(px, py, pr, pr * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cracks
    ctx.strokeStyle = 'rgba(25, 25, 30, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        let cx = Math.random() * size;
        let cy = Math.random() * size;
        ctx.moveTo(cx, cy);
        for (let j = 0; j < 12; j++) {
            cx += (Math.random() - 0.5) * 45;
            cy += (Math.random() - 0.5) * 45;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create Wiener Würfel (Viennese cobblestone) texture
 */
export function createCobblestoneTexture(size: number = 1024): THREE.CanvasTexture {
    const cacheKey = `cobble_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Grout base
    ctx.fillStyle = 'rgb(75, 70, 65)';
    ctx.fillRect(0, 0, size, size);

    // Cobblestones
    const stoneSize = 26;
    const gap = 4;

    for (let y = 0; y < size; y += stoneSize + gap) {
        for (let x = 0; x < size; x += stoneSize + gap) {
            // Slight position variation
            const ox = (Math.random() - 0.5) * 3;
            const oy = (Math.random() - 0.5) * 3;

            // Granite color variation
            const base = 125 + Math.floor(Math.random() * 45);
            ctx.fillStyle = `rgb(${base}, ${base - 8}, ${base - 15})`;

            // Draw stone with rounded corners (using fillRect for compatibility)
            ctx.fillRect(x + ox, y + oy, stoneSize, stoneSize);

            // Surface highlights
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.12})`;
            ctx.beginPath();
            ctx.ellipse(
                x + ox + stoneSize / 2,
                y + oy + stoneSize / 3,
                stoneSize / 3,
                stoneSize / 4,
                0, 0, Math.PI * 2
            );
            ctx.fill();

            // Shadow on edge
            ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
            ctx.fillRect(x + ox, y + oy + stoneSize - 3, stoneSize, 3);
            ctx.fillRect(x + ox + stoneSize - 3, y + oy, 3, stoneSize);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create brushed metal texture
 */
export function createMetalTexture(size: number = 512): THREE.CanvasTexture {
    const cacheKey = `metal_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Brushed metal base
    ctx.fillStyle = 'rgb(175, 175, 180)';
    ctx.fillRect(0, 0, size, size);

    // Horizontal brush strokes
    for (let y = 0; y < size; y++) {
        const brightness = 165 + Math.random() * 35;
        ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness + 5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }

    // Occasional scratches
    ctx.strokeStyle = 'rgba(100, 100, 105, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 30; i++) {
        const x1 = Math.random() * size;
        const y1 = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (Math.random() - 0.5) * 100, y1 + (Math.random() - 0.5) * 20);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create concrete texture
 */
export function createConcreteTexture(size: number = 1024): THREE.CanvasTexture {
    const cacheKey = `concrete_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base gray
    ctx.fillStyle = 'rgb(160, 158, 155)';
    ctx.fillRect(0, 0, size, size);

    // Aggregate noise
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const n = fractalNoise(x, y, 4) * 30 - 15;
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // Small aggregate particles
    for (let i = 0; i < 500; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const shade = 140 + Math.random() * 40;
        ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 10})`;
        ctx.beginPath();
        ctx.arc(px, py, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Create wood texture with grain
 */
export function createWoodTexture(
    color: [number, number, number] = [139, 90, 43],
    size: number = 512
): THREE.CanvasTexture {
    const cacheKey = `wood_${color.join('_')}_${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillRect(0, 0, size, size);

    // Wood grain (horizontal lines with variation)
    for (let y = 0; y < size; y++) {
        const grainNoise = Math.sin(y * 0.1 + smoothNoise(0, y, 20) * 5) * 15;
        const shade = color[0] - 20 + grainNoise;
        ctx.strokeStyle = `rgba(${shade}, ${shade * 0.65}, ${shade * 0.3}, 0.3)`;
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }

    // Knots (occasional dark spots)
    for (let i = 0; i < 3; i++) {
        const kx = Math.random() * size;
        const ky = Math.random() * size;
        const kr = 10 + Math.random() * 20;
        const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
        gradient.addColorStop(0, `rgba(60, 40, 20, 0.6)`);
        gradient.addColorStop(0.5, `rgba(80, 50, 30, 0.3)`);
        gradient.addColorStop(1, `rgba(80, 50, 30, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
}

// Export texture cache for cleanup
export function clearTextureCache(): void {
    textureCache.forEach(tex => tex.dispose());
    textureCache.clear();
}
