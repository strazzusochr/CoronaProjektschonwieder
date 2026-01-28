// Zustand des NPCs (Erweitert für Phase 4 V6.0)
export type NPCState = 'IDLE' | 'WALK' | 'PANIC' | 'ATTACK' | 'CHASE' | 'DEFEND' | 'RIOT' | 'ARRESTED' | 'FLEE' | 'WANDER' | 'WORKING' | 'WALKING' | 'SITTING';

// Typ des NPCs
export type NPCType = 'CIVILIAN' | 'RIOTER' | 'POLICE' | 'TOURIST' | 'DEMONSTRATOR' | 'KRAUSE' | 'JOURNALIST' | 'WEGA' | 'STEFAN' | 'MARIA' | 'HEINRICH';

export interface NPCData {
  id: number;
  position: [number, number, number];
  velocity?: [number, number, number];
  rotation: number;
  state: NPCState;
  type: NPCType;
  faction?: 'CIVILIAN' | 'POLICE' | 'RIOTER' | 'KRAUSE' | 'JOURNALIST';
  relationshipScore?: number; // -100 bis +100
  aggression?: number; // 0 bis 1
  target?: [number, number, number];
}
