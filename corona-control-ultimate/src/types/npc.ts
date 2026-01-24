// Zustand des NPCs (Erweitert für Phase 3)
export type NPCState = 'IDLE' | 'WALK' | 'PANIC' | 'ATTACK' | 'CHASE' | 'DEFEND';

// Typ des NPCs
export type NPCType = 'CIVILIAN' | 'RIOTER' | 'POLICE';

export interface NPCData {
  id: number;
  position: [number, number, number];
  velocity?: [number, number, number];
  rotation: number; // Y-Rotation in Radiant
  state: NPCState;
  type: NPCType; // Neuer Typ
  target?: [number, number, number]; // Ziel für Bewegung (optional)
}
