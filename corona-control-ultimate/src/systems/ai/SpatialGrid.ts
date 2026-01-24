export interface GridEntity {
    id: number;
    x: number;
    z: number;
    vx: number;
    vz: number;
    type?: string; 
}

export class SpatialGrid {
    private cellSize: number;
    private grid: Map<string, GridEntity[]> = new Map();

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    public clear() {
        this.grid.clear();
    }

    public insert(id: number, x: number, z: number, vx: number, vz: number, type?: string) {
        const key = this.getKey(x, z);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push({ id, x, z, vx, vz, type });
    }

    public query(x: number, z: number, radius: number): GridEntity[] {
        const results: GridEntity[] = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerX = Math.floor(x / this.cellSize);
        const centerZ = Math.floor(z / this.cellSize);

        for (let i = -cellRadius; i <= cellRadius; i++) {
            for (let j = -cellRadius; j <= cellRadius; j++) {
                const key = `${centerX + i},${centerZ + j}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (const entity of cell) {
                        const dx = entity.x - x;
                        const dz = entity.z - z;
                        if (dx*dx + dz*dz <= radius*radius) {
                            results.push(entity);
                        }
                    }
                }
            }
        }
        return results;
    }

    private getKey(x: number, z: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cz}`;
    }
}
