import { NPCAIController } from '../ai/NPCAIController';
import type { NPCContext } from '../ai/NPCAIController';
import * as THREE from 'three';

class AISystem {
    private controllers: NPCAIController[] = [];
    private static instance: AISystem;

    private constructor() { }

    public static getInstance(): AISystem {
        if (!AISystem.instance) {
            AISystem.instance = new AISystem();
        }
        return AISystem.instance;
    }

    public registerNPC(context: NPCContext): NPCAIController {
        const controller = new NPCAIController(context);
        this.controllers.push(controller);
        // console.log(`[AISystem] Registered NPC ${context.id}`);
        return controller;
    }

    public unregisterNPC(id: number): void {
        this.controllers = this.controllers.filter(c => (c as any).context.id !== id);
    }

    public update(delta: number): void {
        const perfStart = performance.now();

        // Pass mocked current values for now - in real integration these come from the components
        // For Phase 6 Prototype, we assume the Context object references live data or is updated elsewhere
        this.controllers.forEach(controller => {
            // Context position/forward need to be up to date here
            // In a Component-Entity system, we'd read from the entity. 
            // For now, assume the Context object holds references to vector objects that are updated by the view/physics.
            const ctx = (controller as any).context;
            controller.update(delta, ctx.position, ctx.forward);
        });

        const perfEnd = performance.now();
        if (perfEnd - perfStart > 5) { // 5ms budget warning
            // console.warn(`[AISystem] High update time: ${(perfEnd - perfStart).toFixed(2)}ms for ${this.controllers.length} NPCs`);
        }
    }

    // Global Event Trigger
    public broadcastEvent(type: string, position: THREE.Vector3, range: number): void {
        this.controllers.forEach(controller => {
            const dist = (controller as any).context.position.distanceTo(position);
            if (dist <= range) {
                controller.onSensoryInput(type, position);
            }
        });
    }
}

export default AISystem.getInstance();
