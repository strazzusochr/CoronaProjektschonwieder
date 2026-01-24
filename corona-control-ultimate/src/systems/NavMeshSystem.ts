import * as THREE from 'three';
import { FlowFieldSystem } from './FlowFieldSystem';

interface Node {
    id: number;
    x: number;
    y: number;
    neighbors: Node[];
    cost: number; // 0 for walkable, Infinity for wall
}

interface PathNode {
    node: Node;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent: PathNode | null;
}

export class NavMeshSystem {
    private static instance: NavMeshSystem;
    private nodes: Map<number, Node> = new Map();
    private width: number;
    private height: number;
    private cellSize: number = 2; // Must match FlowField

    private constructor() {
        // Initialize based on FlowField dimensions (hardcoded for now as per FlowFieldSystem)
        this.width = 50;
        this.height = 50;
        this.buildGraph();
    }

    public static getInstance(): NavMeshSystem {
        if (!NavMeshSystem.instance) {
            NavMeshSystem.instance = new NavMeshSystem();
        }
        return NavMeshSystem.instance;
    }

    // Step 1: NavMesh Graph Representation (using Grid for stability)
    private buildGraph() {
        const flowSystem = (FlowFieldSystem as any).instance; // Access singleton if public, else assume default
        // In a real scenario, we'd read the costField. For now, we simulate the same obstacle logic.

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const id = y * this.width + x;
                const isWall = this.checkIfWall(x, y);

                this.nodes.set(id, {
                    id,
                    x,
                    y,
                    neighbors: [],
                    cost: isWall ? Infinity : 1
                });
            }
        }

        // Connect Neighbors (8-way or 4-way)
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const node = this.nodes.get(y * this.width + x);
                if (!node || node.cost === Infinity) continue;

                const dirs = [
                    { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 },
                    // Diagonals
                    { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
                ];

                for (const dir of dirs) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;

                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        const neighbor = this.nodes.get(ny * this.width + nx);
                        if (neighbor && neighbor.cost !== Infinity) {
                            node.neighbors.push(neighbor);
                        }
                    }
                }
            }
        }
    }

    private checkIfWall(x: number, y: number): boolean {
        // Replicating FlowField logic (Phase 7 Match)
        // Barricade
        if (y === 30 && x >= 20 && x < 30) return true;
        // Stephansdom
        if (x >= 20 && x < 30 && y >= 15 && y < 25) return true;
        return false;
    }

    // Step 2: A-Star Algorithm Implementation
    public findPath(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3[] {
        const startNode = this.getNodeFromWorld(startPos.x, startPos.z);
        const targetNode = this.getNodeFromWorld(targetPos.x, targetPos.z);

        if (!startNode || !targetNode || startNode.cost === Infinity || targetNode.cost === Infinity) {
            return []; // Invalid path
        }

        const openSet: PathNode[] = [];
        const closedSet: Set<number> = new Set();

        openSet.push({ node: startNode, g: 0, h: this.heuristic(startNode, targetNode), f: 0, parent: null });

        while (openSet.length > 0) {
            // Sort by F (lowest first)
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;

            if (current.node.id === targetNode.id) {
                return this.reconstructPath(current, startPos, targetPos);
            }

            closedSet.add(current.node.id);

            for (const neighbor of current.node.neighbors) {
                if (closedSet.has(neighbor.id)) continue;

                // Diagonal cost = 1.41, Straight = 1
                const moveCost = (neighbor.x !== current.node.x && neighbor.y !== current.node.y) ? 1.41 : 1;
                const tentativeG = current.g + moveCost;

                const existingNode = openSet.find(n => n.node.id === neighbor.id);

                if (!existingNode || tentativeG < existingNode.g) {
                    const h = this.heuristic(neighbor, targetNode);
                    const newNode: PathNode = {
                        node: neighbor,
                        g: tentativeG,
                        h: h,
                        f: tentativeG + h,
                        parent: current
                    };

                    if (!existingNode) {
                        openSet.push(newNode);
                    } else {
                        existingNode.g = tentativeG;
                        existingNode.f = tentativeG + h;
                        existingNode.parent = current;
                    }
                }
            }
        }

        return []; // No path found
    }

    private heuristic(a: Node, b: Node): number {
        // Euclidean distance
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Step 3 & 4: Path Reconstruction and Smoothing
    private reconstructPath(endNode: PathNode, realStart: THREE.Vector3, realTarget: THREE.Vector3): THREE.Vector3[] {
        const path: THREE.Vector3[] = [];
        let current: PathNode | null = endNode;

        // Trace back
        while (current) {
            path.push(this.getWorldFromNode(current.node));
            current = current.parent;
        }

        // Reverse to get Start -> End
        path.reverse();

        // String Pulling (Simplified)
        // 1. Always include real target
        path[path.length - 1] = realTarget;
        // 2. Always include real start (though usually we ignore first point if we are there)
        path[0] = realStart;

        // Basic smoothing: Remove intermediate nodes if line-of-sight exists
        // (Skipping full LoS check for simplicity, assuming grid resolution is rough)

        return path;
    }

    private getNodeFromWorld(wx: number, wz: number): Node | null {
        const gx = Math.floor((wx + (this.width * this.cellSize) / 2) / this.cellSize);
        const gy = Math.floor((wz + (this.height * this.cellSize) / 2) / this.cellSize);

        if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
            return this.nodes.get(gy * this.width + gx) || null;
        }
        return null;
    }

    private getWorldFromNode(node: Node): THREE.Vector3 {
        // Center of cell
        const wx = (node.x * this.cellSize) - (this.width * this.cellSize) / 2 + (this.cellSize / 2);
        const wz = (node.y * this.cellSize) - (this.height * this.cellSize) / 2 + (this.cellSize / 2);
        return new THREE.Vector3(wx, 0.5, wz);
    }
}
