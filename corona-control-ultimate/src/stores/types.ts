import type { PlayerState, Vector3Array } from '@/types/game';

export type MissionType = 'SURVIVE' | 'DISPERSE_RIOTERS' | 'REACH_TARGET';

export interface Mission {
  id: number;
  type: MissionType;
  description: string;
  targetAmount?: number;
  currentAmount: number;
  timeLimit?: number; // Sekunden
}

export interface GameState {
  points: number;
  health: number;
  isGameOver: boolean;
  isVictory: boolean;
  dayTime: number;
  currentMissionIndex: number;
  isPlaying: boolean; // Menü vs Gameplay
  activeCutscene: string | null;
  activePrompt: string | null;
  cutsceneTime: number;
}

export type ItemType = 'WEAPON' | 'CONSUMABLE' | 'MATERIAL';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  maxStack: number;
  quantity: number;
  effect?: {
    type: 'HEAL' | 'BUFF';
    value: number;
  };
}

export interface InventorySlot {
  index: number;
  item: Item | null;
}

export interface GameStore {
  gameState: GameState;
  missions: Mission[];

  // Inventory
  inventory: InventorySlot[];
  isInventoryOpen: boolean;
  toggleInventory: () => void;
  addItem: (newItem: Item) => boolean;
  removeItem: (slotIndex: number, amount?: number) => void;
  useItem: (slotIndex: number) => void;

  // Persistence
  saveGame: () => void;
  loadGame: () => boolean;

  player: PlayerState;
  tensionLevel: number;

  // Actions
  startGame: () => void;
  resetGame: () => void;

  setPoints: (points: number) => void;
  addPoints: (amount: number) => void;
  setHealth: (health: number) => void;
  takeDamage: (amount: number) => void;
  setTime: (time: number) => void;

  setPlayerPosition: (pos: Vector3Array) => void;
  setPlayerHealth: (hp: number) => void;
  setTension: (tension: number) => void;
  toggleBinoculars: () => void;

  // Mission Actions
  updateMissionProgress: (amount: number) => void;
  nextMission: () => void;
  setGameOver: (isOver: boolean) => void;
  setVictory: (isVictory: boolean) => void;

  // Projektile
  projectiles: Array<{
    id: number;
    type: 'STONE' | 'MOLOTOV';
    position: [number, number, number];
    velocity: [number, number, number];
  }>;
  addProjectile: (position: [number, number, number], velocity: [number, number, number], type?: 'STONE' | 'MOLOTOV') => void;
  removeProjectile: (id: number) => void;

  // World Items
  worldItems: Array<{
    id: string;
    itemId: string;
    position: [number, number, number];
  }>;
  spawnItem: (itemId: string, position: [number, number, number]) => void;
  removeWorldItem: (id: string) => void;

  // Settings
  settings: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  setVolume: (type: 'MASTER' | 'MUSIC' | 'SFX', value: number) => void;
  setGraphicsQuality: (quality: 'LOW' | 'MEDIUM' | 'HIGH') => void;

  // Debugging
  debugMode: {
    physics: boolean;
    fps: boolean;
  };
  toggleDebug: (type: 'PHYSICS' | 'FPS') => void;

  // Cutscene Actions
  startCutscene: (id: string) => void;
  endCutscene: () => void;
  setCutsceneTime: (time: number) => void;
  setPrompt: (text: string | null) => void;
  spawnWave: (count: number, type?: string) => void;
  npcs: Array<{ id: number; type: string; position: [number, number, number]; velocity?: [number, number, number]; state?: string }>;
  updateNpc: (id: number, data: any) => void;
  markedNpcIds: number[];
  markNpc: (id: number) => void;
}
