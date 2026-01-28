/**
 * Corona Control Ultimate - Wien World Generator
 * Gemäß V6.0 Spezifikation
 * 
 * Prozedurale Weltgenerierung mit:
 * - Chunk Streaming (Radius um Spieler)
 * - Architekturstil-Pools (Gründerzeit, Modern, Barock)
 */

import type { Vector3Array } from '@/types/game';

// Chunk-Größe in Metern
export const CHUNK_SIZE = 50;

// Streaming-Radius in Chunks
export const STREAMING_RADIUS = 3;

/**
 * Architekturstile für Wiener Gebäude
 */
export type ArchitectureStyle = 'GRUENDERZEIT' | 'MODERN' | 'BAROQUE' | 'GOTHIC';

/**
 * Gebäude-Definition für prozsedurale Generierung
 */
export interface BuildingDefinition {
    id: string;
    style: ArchitectureStyle;
    floors: number;
    width: number;
    depth: number;
    hasBalcony: boolean;
    hasDormer: boolean;
    facadeVariant: number;
}

/**
 * Chunk-Daten
 */
export interface ChunkData {
    x: number;
    z: number;
    buildings: BuildingDefinition[];
    streetLights: Vector3Array[];
    trees: Vector3Array[];
    benches: Vector3Array[];
    isLoaded: boolean;
}

/**
 * Wien World Generator - Singleton
 */
class WienGenerator {
    private static instance: WienGenerator;
    private loadedChunks: Map<string, ChunkData> = new Map();
    private seed: number = 42;

    private constructor() { }

    public static getInstance(): WienGenerator {
        if (!WienGenerator.instance) {
            WienGenerator.instance = new WienGenerator();
        }
        return WienGenerator.instance;
    }

    /**
     * Chunk-Key aus Koordinaten
     */
    private getChunkKey(x: number, z: number): string {
        return `${x},${z}`;
    }

    /**
     * Chunk-Koordinaten aus Weltposition
     */
    public getChunkCoords(worldX: number, worldZ: number): { x: number; z: number } {
        return {
            x: Math.floor(worldX / CHUNK_SIZE),
            z: Math.floor(worldZ / CHUNK_SIZE)
        };
    }

    /**
     * Deterministischer Zufallswert basierend auf Seed und Position
     */
    private seededRandom(x: number, z: number, salt: number = 0): number {
        const n = Math.sin(x * 12.9898 + z * 78.233 + this.seed + salt) * 43758.5453;
        return n - Math.floor(n);
    }

    /**
     * Generiert einen Chunk prozedural
     */
    public generateChunk(chunkX: number, chunkZ: number): ChunkData {
        const key = this.getChunkKey(chunkX, chunkZ);

        // Bereits generiert?
        if (this.loadedChunks.has(key)) {
            return this.loadedChunks.get(key)!;
        }

        const chunk: ChunkData = {
            x: chunkX,
            z: chunkZ,
            buildings: [],
            streetLights: [],
            trees: [],
            benches: [],
            isLoaded: false
        };

        // Basis-Position des Chunks
        const baseX = chunkX * CHUNK_SIZE;
        const baseZ = chunkZ * CHUNK_SIZE;

        // Gebäude generieren (2-4 pro Chunk)
        const numBuildings = 2 + Math.floor(this.seededRandom(chunkX, chunkZ, 0) * 3);
        for (let i = 0; i < numBuildings; i++) {
            const styles: ArchitectureStyle[] = ['GRUENDERZEIT', 'MODERN', 'BAROQUE'];
            const style = styles[Math.floor(this.seededRandom(chunkX, chunkZ, i + 10) * 3)];

            chunk.buildings.push({
                id: `building_${chunkX}_${chunkZ}_${i}`,
                style,
                floors: 3 + Math.floor(this.seededRandom(chunkX, chunkZ, i + 20) * 4),
                width: 10 + this.seededRandom(chunkX, chunkZ, i + 30) * 10,
                depth: 8 + this.seededRandom(chunkX, chunkZ, i + 40) * 8,
                hasBalcony: this.seededRandom(chunkX, chunkZ, i + 50) > 0.5,
                hasDormer: this.seededRandom(chunkX, chunkZ, i + 60) > 0.6,
                facadeVariant: Math.floor(this.seededRandom(chunkX, chunkZ, i + 70) * 4)
            });
        }

        // Straßenlaternen (4-6 pro Chunk)
        const numLights = 4 + Math.floor(this.seededRandom(chunkX, chunkZ, 100) * 3);
        for (let i = 0; i < numLights; i++) {
            chunk.streetLights.push([
                baseX + this.seededRandom(chunkX, chunkZ, 100 + i) * CHUNK_SIZE,
                0,
                baseZ + this.seededRandom(chunkX, chunkZ, 200 + i) * CHUNK_SIZE
            ]);
        }

        // Bäume (2-4 pro Chunk)
        const numTrees = 2 + Math.floor(this.seededRandom(chunkX, chunkZ, 300) * 3);
        for (let i = 0; i < numTrees; i++) {
            chunk.trees.push([
                baseX + this.seededRandom(chunkX, chunkZ, 300 + i) * CHUNK_SIZE,
                0,
                baseZ + this.seededRandom(chunkX, chunkZ, 400 + i) * CHUNK_SIZE
            ]);
        }

        this.loadedChunks.set(key, chunk);
        return chunk;
    }

    /**
     * Aktualisiert geladene Chunks basierend auf Spielerposition
     */
    public updateStreamingPools(playerX: number, playerZ: number): ChunkData[] {
        const { x: centerX, z: centerZ } = this.getChunkCoords(playerX, playerZ);
        const activeChunks: ChunkData[] = [];

        // Chunks im Radius laden
        for (let dx = -STREAMING_RADIUS; dx <= STREAMING_RADIUS; dx++) {
            for (let dz = -STREAMING_RADIUS; dz <= STREAMING_RADIUS; dz++) {
                const chunk = this.generateChunk(centerX + dx, centerZ + dz);
                chunk.isLoaded = true;
                activeChunks.push(chunk);
            }
        }

        // Nicht mehr benötigte Chunks entladen
        this.loadedChunks.forEach((chunk, key) => {
            const distance = Math.max(
                Math.abs(chunk.x - centerX),
                Math.abs(chunk.z - centerZ)
            );
            if (distance > STREAMING_RADIUS + 1) {
                this.loadedChunks.delete(key);
            }
        });

        return activeChunks;
    }

    /**
     * Seed setzen (für deterministische Welten)
     */
    public setSeed(seed: number): void {
        this.seed = seed;
        this.loadedChunks.clear();
    }
}

export default WienGenerator.getInstance();
