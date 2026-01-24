export type Vector3Array = [number, number, number];
export type QuaternionArray = [number, number, number, number];

export interface PlayerState {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  position: Vector3Array;
  rotation: Vector3Array; // Euler
  isGrounded: boolean;
  isSprinting: boolean;
  isJumping: boolean;
  isDead: boolean;
  currentEquipmentSlot: number;
  inventory: string[]; // IDs
  isUsingBinoculars: boolean;
}

export interface GameState {
  timeOfDay: number; // Sekunden seit 06:00
  day: number;
  tensionLevel: number; // 0-100 (Eskalationsstufe)
  activeEvents: string[];
  activeCutscene: string | null;
}
