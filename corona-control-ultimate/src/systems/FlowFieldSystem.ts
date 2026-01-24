import * as THREE from 'three';

export class FlowFieldSystem {
    private static instance: FlowFieldSystem;
    private width: number;
    private height: number;
    private cellSize: number;
    
    // Grid Data
    private costField: Int8Array; // 0 = Walkable, 127 = Wall
    private integrationField: Uint16Array; // Distance to target
    private flowField: Vector2[]; // Direction vectors

    private constructor(width: number, height: number, cellSize: number) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        
        const size = width * height;
        this.costField = new Int8Array(size).fill(0);
        this.integrationField = new Uint16Array(size).fill(65535); // Max value
        this.flowField = new Array(size).fill(null).map(() => ({ x: 0, y: 0 }));
        
        this.initializeStaticObstacles();
    }

    public static getInstance(): FlowFieldSystem {
        if (!FlowFieldSystem.instance) {
            // Default: 50x50 grid with 2m cells = 100x100m area for Stephansplatz
            FlowFieldSystem.instance = new FlowFieldSystem(50, 50, 2);
        }
        return FlowFieldSystem.instance;
    }
    
    private initializeStaticObstacles() {
        // Simple manual definition for Barricades/Buildings
        // Center is (25, 25) which maps to (0,0) in world
        
        // Barricade at Z=10 (Grid Z ~ 30)
        // Obstacle line
        for (let x = 20; x < 30; x++) {
             this.setCost(x, 30, 127); // Solid wall
        }
        
         // Stephansdom (roughly)
         for (let x = 20; x < 30; x++) {
             for (let y = 15; y < 25; y++) {
                 this.setCost(x, y, 127);
             }
         }
    }

    private setCost(x: number, y: number, value: number) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.costField[y * this.width + x] = value;
        }
    }

    // --- Pathfinding Core ---

    public calculateFlowField(targetX: number, targetZ: number) {
        // 1. Reset Integration Field
        this.integrationField.fill(65535);

        // Convert World Pos to Grid Pos
        const startX = Math.floor((targetX + (this.width * this.cellSize) / 2) / this.cellSize);
        const startY = Math.floor((targetZ + (this.height * this.cellSize) / 2) / this.cellSize);

        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) return;

        // 2. Dijkstra Flood Fill (Integration Field)
        const queue: number[] = [startY * this.width + startX];
        this.integrationField[startY * this.width + startX] = 0;

        while (queue.length > 0) {
            const currentIdx = queue.shift()!;
            const cx = currentIdx % this.width;
            const cy = Math.floor(currentIdx / this.width);
            const currentDist = this.integrationField[currentIdx];

            // Check Neighbors (4-way)
            const neighbors = [
                { x: cx + 1, y: cy },
                { x: cx - 1, y: cy },
                { x: cx, y: cy + 1 },
                { x: cx, y: cy - 1 }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                    const idx = n.y * this.width + n.x;
                    const cost = this.costField[idx];

                    if (cost < 127) { // Walkable
                        // Distance = Current + 1 (Weight)
                        if (this.integrationField[idx] > currentDist + 1) {
                            this.integrationField[idx] = currentDist + 1;
                            queue.push(idx);
                        }
                    }
                }
            }
        }

        // 3. Generate Flow Vectors
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                const cost = this.costField[idx];

                if (cost >= 127) {
                    this.flowField[idx] = { x: 0, y: 0 };
                    continue;
                }

                let minNeighborDist = this.integrationField[idx];
                let flowX = 0;
                let flowY = 0;

                // Check all neighbors for lowest integration value
                // Kernel 3x3
                 for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        
                         if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                             const nIdx = ny * this.width + nx;
                             const nDist = this.integrationField[nIdx];
                             
                             if (nDist < minNeighborDist) {
                                 minNeighborDist = nDist;
                                 flowX = dx;
                                 flowY = dy;
                             }
                         }
                    }
                 }
                 
                 // Normalize
                 if (flowX !== 0 || flowY !== 0) {
                     const len = Math.sqrt(flowX*flowX + flowY*flowY);
                     this.flowField[idx] = { x: flowX / len, y: flowY / len };
                 } else {
                     this.flowField[idx] = { x: 0, y: 0 };
                 }
            }
        }
    }
    
    public getFlowVector(worldX: number, worldZ: number): { x: number, y: number } {
         const gx = Math.floor((worldX + (this.width * this.cellSize) / 2) / this.cellSize);
         const gy = Math.floor((worldZ + (this.height * this.cellSize) / 2) / this.cellSize);
         
         if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
             return this.flowField[gy * this.width + gx];
         }
         return { x: 0, y: 0 };
    }
}

interface Vector2 {
    x: number;
    y: number;
}
