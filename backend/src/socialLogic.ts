export interface NPC {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: string;
  path?: [number, number, number][];
  pathIndex?: number;
}

export function updateSocialBehaviors(npcs: Record<string, NPC>) {
  const npcList = Object.values(npcs);
  const updatedNpcs: Record<string, NPC> = {};

  npcList.forEach((npc) => {
    // 1. PATH FOLLOWING (Prioritized)
    if (npc.path && npc.path.length > 0) {
      const target = npc.path[npc.pathIndex || 0];
      const dx = target[0] - npc.position[0];
      const dy = target[1] - npc.position[1];
      const dz = target[2] - npc.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.5) {
        // Switch to next waypoint
        npc.pathIndex = ((npc.pathIndex || 0) + 1) % npc.path.length;
      } else {
        // Move towards waypoint
        const speed = npc.action === 'JOGGING' ? 0.3 : 0.1;
        npc.position[0] += (dx / dist) * speed;
        npc.position[1] += (dy / dist) * speed;
        npc.position[2] += (dz / dist) * speed;
      }
    }

    // 2. SOCIAL DISTANCING & WANDER (Existing)
    let avoidanceForce: [number, number] = [0, 0];
    
    npcList.forEach((other) => {
      if (npc.id === other.id) return;

      const dx = npc.position[0] - other.position[0];
      const dz = npc.position[2] - other.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Social Distancing: NPCs avoid each other if too close
      if (dist < 1.5) {
        avoidanceForce[0] += dx / (dist + 0.1) * 0.1;
        avoidanceForce[1] += dz / (dist + 0.1) * 0.1;
      }
    });

    // Apply basic wander + social force
    if (npc.action === 'WANDER') {
      npc.position[0] += (Math.random() - 0.5) * 0.2 + avoidanceForce[0];
      npc.position[2] += (Math.random() - 0.5) * 0.2 + avoidanceForce[1];
    }

    updatedNpcs[npc.id] = npc;
  });

  return updatedNpcs;
}
