# 🚨 CORONA CONTROL - ULTIMATIVE IMPLEMENTIERUNGS-PFLICHTDOKUMENTATION 🚨

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DIESE DATEI IST RECHTLICH BINDEND FÜR JEDEN AI-CODER                       ║
║  JEDE ZEILE MUSS IMPLEMENTIERT WERDEN - KEINE AUSLASSUNGEN ERLAUBT          ║
║  VALIDIERUNG ERFOLGT DURCH AUTOMATISCHE PRÜFSUMMEN UND CODEANALYSE          ║
║  BEI UNVOLLSTÄNDIGER IMPLEMENTIERUNG: AUTOMATISCHE NEUANFORDERUNG           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

# 📋 MASTER-VALIDIERUNGS-CHECKLISTE

## SEKTION A: PROJEKT-GRUNDLAGEN [20 Pflichtpunkte]

### A1. package.json [PFLICHT-ID: PKG-001]
**Checksum: CC-PKG-001-A7B3C9D2E1F4**
**Mindestzeilen: 70**

```json
{
  "name": "corona-control",
  "version": "1.0.0",
  "description": "Police simulation game during COVID-19 demonstrations in Vienna",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "validate": "node scripts/validate-implementation.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "jest",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/rapier": "^1.2.0",
    "expo": "~51.0.0",
    "expo-asset": "~10.0.0",
    "expo-av": "~14.0.0",
    "expo-file-system": "~17.0.0",
    "expo-gl": "~14.0.0",
    "expo-haptics": "~13.0.0",
    "expo-linear-gradient": "~13.0.0",
    "expo-status-bar": "~1.12.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.74.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    "react-native-web": "~0.19.0",
    "three": "^0.158.0",
    "zustand": "^4.4.0",
    "immer": "^10.0.0",
    "lodash": "^4.17.21",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/lodash": "^4.14.200",
    "@types/react": "~18.2.45",
    "@types/three": "^0.158.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.0"
  },
  "private": true,
  "validationChecksum": "CC-PKG-001-A7B3C9D2E1F4"
}
```

**VALIDIERUNG PKG-001:**
- [ ] Datei existiert: `/package.json`
- [ ] Alle 24 dependencies vorhanden
- [ ] Alle 10 devDependencies vorhanden
- [ ] Alle 10 scripts definiert
- [ ] validationChecksum am Ende vorhanden

---

### A2. tsconfig.json [PFLICHT-ID: TSC-001]
**Checksum: CC-TSC-001-B8C4D0E2F6G3**
**Mindestzeilen: 50**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@systems/*": ["src/systems/*"],
      "@stores/*": ["src/stores/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@assets/*": ["assets/*"],
      "@shaders/*": ["src/shaders/*"],
      "@hooks/*": ["src/hooks/*"],
      "@constants/*": ["src/constants/*"]
    },
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx", "src/**/*"],
  "exclude": ["node_modules"]
}
```

**VALIDIERUNG TSC-001:**
- [ ] Datei existiert: `/tsconfig.json`
- [ ] strict: true aktiviert
- [ ] Alle 10 path-aliases definiert

---

## SEKTION B: TYPE-DEFINITIONEN [180 Pflichtpunkte]

### B1. src/types/game.types.ts [PFLICHT-ID: TYPE-001]
**Checksum: CC-TYPE-001-T3U4V5W6**
**Mindestzeilen: 300**
**Pflicht-Enums: 7**
**Pflicht-Interfaces: 18**

```typescript
/**
 * @file game.types.ts
 * @validation VAL-TYPE-001
 * @checksum CC-TYPE-001-T3U4V5W6
 */

// ═══════════════════════════════════════════════════════════════════
// ENUM DEFINITIONEN - ALLE 7 PFLICHT
// ═══════════════════════════════════════════════════════════════════

export enum GameState {
  INITIALIZING = 'INITIALIZING',
  LOADING = 'LOADING',
  MAIN_MENU = 'MAIN_MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  CUTSCENE = 'CUTSCENE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum DifficultyLevel {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  REALISTIC = 'REALISTIC'
}

export enum GameMode {
  CAMPAIGN = 'CAMPAIGN',
  SCENARIO = 'SCENARIO',
  SANDBOX = 'SANDBOX'
}

export enum EscalationLevel {
  PEACEFUL = 0,
  TENSE = 1,
  CONFRONTATIONAL = 2,
  VIOLENT = 3,
  RIOT = 4
}

export enum WeatherCondition {
  CLEAR = 'CLEAR',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  HEAVY_RAIN = 'HEAVY_RAIN',
  FOG = 'FOG',
  SNOW = 'SNOW'
}

export enum TimeOfDay {
  DAWN = 'DAWN',
  DAY = 'DAY',
  DUSK = 'DUSK',
  NIGHT = 'NIGHT'
}

export enum ObjectiveType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  BONUS = 'BONUS',
  HIDDEN = 'HIDDEN'
}

// ═══════════════════════════════════════════════════════════════════
// INTERFACE DEFINITIONEN - ALLE 18 PFLICHT
// ═══════════════════════════════════════════════════════════════════

export interface IVector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface IRotation3D {
  readonly pitch: number;
  readonly yaw: number;
  readonly roll: number;
}

export interface ITransform {
  readonly position: IVector3D;
  readonly rotation: IRotation3D;
  readonly scale: IVector3D;
}

export interface IBounds {
  readonly min: IVector3D;
  readonly max: IVector3D;
  readonly center: IVector3D;
  readonly size: IVector3D;
}

export interface IGameConfig {
  readonly gameId: string;
  readonly version: string;
  readonly difficulty: DifficultyLevel;
  readonly gameMode: GameMode;
  readonly maxNPCs: number;
  readonly renderDistance: number;
  readonly shadowQuality: 'low' | 'medium' | 'high' | 'ultra';
  readonly particleQuality: 'low' | 'medium' | 'high' | 'ultra';
  readonly antiAliasing: boolean;
  readonly vsync: boolean;
  readonly targetFPS: 30 | 60 | 120;
  readonly audioEnabled: boolean;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly voiceVolume: number;
  readonly hapticFeedback: boolean;
  readonly tutorialEnabled: boolean;
  readonly debugMode: boolean;
}

export interface IGameStats {
  readonly playTime: number;
  readonly totalArrest: number;
  readonly totalInjuries: number;
  readonly civilianCasualties: number;
  readonly policeCasualties: number;
  readonly propertyDamage: number;
  readonly moralityScore: number;
  readonly escalationPeaks: number;
  readonly commandsIssued: number;
  readonly unitsDeployed: number;
  readonly objectivesCompleted: number;
  readonly objectivesFailed: number;
  readonly secretsFound: number;
  readonly achievementsUnlocked: readonly string[];
}

export interface IGameSession {
  readonly sessionId: string;
  readonly startTime: number;
  readonly currentLevel: number;
  readonly checkpoint: number;
  readonly config: IGameConfig;
  readonly stats: IGameStats;
  readonly state: GameState;
  readonly isPaused: boolean;
  readonly elapsedTime: number;
}

export interface IGameObject {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly transform: ITransform;
  readonly bounds: IBounds;
  readonly isActive: boolean;
  readonly isVisible: boolean;
  readonly layer: number;
  readonly tags: readonly string[];
}

export interface IObjective {
  readonly id: string;
  readonly type: ObjectiveType;
  readonly title: string;
  readonly description: string;
  readonly isCompleted: boolean;
  readonly isFailed: boolean;
  readonly isActive: boolean;
  readonly progress: number;
  readonly maxProgress: number;
  readonly timeLimit: number | null;
  readonly rewards: readonly IReward[];
  readonly penalties: readonly IPenalty[];
}

export interface IReward {
  readonly type: 'score' | 'unlock' | 'achievement' | 'equipment' | 'unit';
  readonly value: string | number;
  readonly description: string;
}

export interface IPenalty {
  readonly type: 'score' | 'morality' | 'unit_loss' | 'objective_fail';
  readonly value: string | number;
  readonly description: string;
}

export interface IGameEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly source: string;
  readonly target: string | null;
  readonly data: Record<string, unknown>;
  readonly priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface IInputState {
  readonly isPressed: boolean;
  readonly wasPressed: boolean;
  readonly wasReleased: boolean;
  readonly duration: number;
  readonly value: number;
}

export interface ITouchInput {
  readonly id: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly startPosition: { readonly x: number; readonly y: number };
  readonly delta: { readonly x: number; readonly y: number };
  readonly pressure: number;
  readonly phase: 'began' | 'moved' | 'stationary' | 'ended' | 'cancelled';
}

export interface IInput {
  readonly touches: readonly ITouchInput[];
  readonly pinchScale: number;
  readonly rotationDelta: number;
  readonly panDelta: { readonly x: number; readonly y: number };
  readonly doubleTap: boolean;
  readonly longPress: boolean;
}

export interface ILoadingProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly stage: string;
  readonly message: string;
}

export interface ISaveData {
  readonly version: string;
  readonly timestamp: number;
  readonly session: IGameSession;
  readonly checksum: string;
}

// ═══════════════════════════════════════════════════════════════════
// KONSTANTEN - ALLE PFLICHT
// ═══════════════════════════════════════════════════════════════════

export const DEFAULT_GAME_CONFIG: IGameConfig = {
  gameId: '',
  version: '1.0.0',
  difficulty: DifficultyLevel.NORMAL,
  gameMode: GameMode.CAMPAIGN,
  maxNPCs: 500,
  renderDistance: 200,
  shadowQuality: 'high',
  particleQuality: 'high',
  antiAliasing: true,
  vsync: true,
  targetFPS: 60,
  audioEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  voiceVolume: 1.0,
  hapticFeedback: true,
  tutorialEnabled: true,
  debugMode: false
} as const;

export const DEFAULT_GAME_STATS: IGameStats = {
  playTime: 0,
  totalArrest: 0,
  totalInjuries: 0,
  civilianCasualties: 0,
  policeCasualties: 0,
  propertyDamage: 0,
  moralityScore: 100,
  escalationPeaks: 0,
  commandsIssued: 0,
  unitsDeployed: 0,
  objectivesCompleted: 0,
  objectivesFailed: 0,
  secretsFound: 0,
  achievementsUnlocked: []
} as const;

export const GAME_LIMITS = {
  MIN_NPCS: 50,
  MAX_NPCS: 500,
  MIN_RENDER_DISTANCE: 50,
  MAX_RENDER_DISTANCE: 500,
  MIN_VOLUME: 0,
  MAX_VOLUME: 1,
  MIN_MORALITY: 0,
  MAX_MORALITY: 100,
  MIN_ESCALATION: 0,
  MAX_ESCALATION: 4
} as const;

// VALIDIERUNGS-MARKER
export const TYPE_001_VALIDATION = {
  fileId: 'TYPE-001',
  checksum: 'CC-TYPE-001-T3U4V5W6',
  enums: 7,
  interfaces: 18,
  constants: 3,
  validated: false
} as const;
```

**VALIDIERUNG TYPE-001:**
- [ ] Datei existiert: `/src/types/game.types.ts`
- [ ] Alle 7 Enums: GameState, DifficultyLevel, GameMode, EscalationLevel, WeatherCondition, TimeOfDay, ObjectiveType
- [ ] Alle 18 Interfaces implementiert
- [ ] Alle 3 Konstanten: DEFAULT_GAME_CONFIG, DEFAULT_GAME_STATS, GAME_LIMITS
- [ ] TYPE_001_VALIDATION Marker am Ende

---

### B2. src/types/character.types.ts [PFLICHT-ID: TYPE-002]
**Checksum: CC-TYPE-002-A1B2C3D4**
**Mindestzeilen: 400**
**Pflicht-Enums: 6**
**Pflicht-Interfaces: 15**

```typescript
/**
 * @file character.types.ts
 * @validation VAL-TYPE-002
 * @checksum CC-TYPE-002-A1B2C3D4
 */

import { IGameObject, ITransform, IVector3D } from './game.types';

// ═══════════════════════════════════════════════════════════════════
// ENUM DEFINITIONEN - ALLE 6 PFLICHT
// ═══════════════════════════════════════════════════════════════════

export enum CharacterType {
  POLICE_OFFICER = 'POLICE_OFFICER',
  POLICE_COMMANDER = 'POLICE_COMMANDER',
  RIOT_POLICE = 'RIOT_POLICE',
  POLICE_MEDIC = 'POLICE_MEDIC',
  CIVILIAN = 'CIVILIAN',
  PROTESTER_PEACEFUL = 'PROTESTER_PEACEFUL',
  PROTESTER_AGGRESSIVE = 'PROTESTER_AGGRESSIVE',
  JOURNALIST = 'JOURNALIST'
}

export enum CharacterState {
  IDLE = 'IDLE',
  WALKING = 'WALKING',
  RUNNING = 'RUNNING',
  SPRINTING = 'SPRINTING',
  CROUCHING = 'CROUCHING',
  ARRESTED = 'ARRESTED',
  INJURED = 'INJURED',
  UNCONSCIOUS = 'UNCONSCIOUS',
  DEAD = 'DEAD',
  FLEEING = 'FLEEING',
  ATTACKING = 'ATTACKING',
  DEFENDING = 'DEFENDING'
}

export enum PoliceRank {
  OFFICER = 'OFFICER',
  SENIOR_OFFICER = 'SENIOR_OFFICER',
  SERGEANT = 'SERGEANT',
  LIEUTENANT = 'LIEUTENANT',
  CAPTAIN = 'CAPTAIN',
  COMMANDER = 'COMMANDER'
}

export enum EquipmentSlot {
  HEAD = 'HEAD',
  BODY = 'BODY',
  HANDS = 'HANDS',
  LEGS = 'LEGS',
  FEET = 'FEET',
  PRIMARY_WEAPON = 'PRIMARY_WEAPON',
  SECONDARY_WEAPON = 'SECONDARY_WEAPON',
  UTILITY = 'UTILITY'
}

export enum AnimationState {
  IDLE_STAND = 'IDLE_STAND',
  IDLE_ALERT = 'IDLE_ALERT',
  WALK_NORMAL = 'WALK_NORMAL',
  WALK_PATROL = 'WALK_PATROL',
  RUN_NORMAL = 'RUN_NORMAL',
  RUN_TACTICAL = 'RUN_TACTICAL',
  SPRINT = 'SPRINT',
  CROUCH_IDLE = 'CROUCH_IDLE',
  CROUCH_WALK = 'CROUCH_WALK',
  ARREST_START = 'ARREST_START',
  ARREST_HOLD = 'ARREST_HOLD',
  SHIELD_RAISE = 'SHIELD_RAISE',
  SHIELD_BLOCK = 'SHIELD_BLOCK',
  BATON_SWING = 'BATON_SWING',
  THROW = 'THROW',
  FALL = 'FALL'
}

export enum InjuryType {
  NONE = 'NONE',
  MINOR_BRUISE = 'MINOR_BRUISE',
  MAJOR_BRUISE = 'MAJOR_BRUISE',
  LACERATION = 'LACERATION',
  FRACTURE = 'FRACTURE',
  CONCUSSION = 'CONCUSSION',
  TEAR_GAS_EXPOSURE = 'TEAR_GAS_EXPOSURE',
  CRITICAL = 'CRITICAL'
}

// ═══════════════════════════════════════════════════════════════════
// INTERFACE DEFINITIONEN - ALLE 15 PFLICHT
// ═══════════════════════════════════════════════════════════════════

export interface ICharacterAttributes {
  readonly health: number;
  readonly maxHealth: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly morale: number;
  readonly maxMorale: number;
  readonly speed: number;
  readonly baseSpeed: number;
  readonly awareness: number;
  readonly aggression: number;
  readonly fear: number;
  readonly obedience: number;
}

export interface ICharacterMovement {
  readonly velocity: IVector3D;
  readonly acceleration: IVector3D;
  readonly targetPosition: IVector3D | null;
  readonly isMoving: boolean;
  readonly isGrounded: boolean;
  readonly movementSpeed: number;
  readonly rotationSpeed: number;
  readonly currentPath: readonly IVector3D[];
  readonly pathIndex: number;
}

export interface IEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly modelPath: string;
  readonly isEquipped: boolean;
  readonly durability: number;
  readonly maxDurability: number;
  readonly weight: number;
}

export interface IInventory {
  readonly items: readonly IEquipmentItem[];
  readonly maxSlots: number;
  readonly currentWeight: number;
  readonly maxWeight: number;
  readonly equippedItems: Readonly<Record<EquipmentSlot, IEquipmentItem | null>>;
}

export interface IInjuryStatus {
  readonly type: InjuryType;
  readonly severity: number;
  readonly location: string;
  readonly timestamp: number;
  readonly isTreated: boolean;
  readonly healingProgress: number;
}

export interface ICharacterAIState {
  readonly currentBehavior: string;
  readonly behaviorStack: readonly string[];
  readonly targetEntity: string | null;
  readonly threatLevel: number;
  readonly alertLevel: number;
  readonly lastKnownThreatPosition: IVector3D | null;
  readonly decisionCooldown: number;
}

export interface IAnimationControllerState {
  readonly currentState: AnimationState;
  readonly previousState: AnimationState;
  readonly transitionProgress: number;
  readonly blendWeight: number;
  readonly playbackSpeed: number;
  readonly isPlaying: boolean;
  readonly isLooping: boolean;
  readonly currentTime: number;
  readonly duration: number;
}

export interface ICharacter extends IGameObject {
  readonly characterType: CharacterType;
  readonly characterState: CharacterState;
  readonly attributes: ICharacterAttributes;
  readonly movement: ICharacterMovement;
  readonly inventory: IInventory;
  readonly injuries: readonly IInjuryStatus[];
  readonly aiState: ICharacterAIState;
  readonly animationState: IAnimationControllerState;
  readonly polygonCount: number;
  readonly lodLevel: number;
}

export interface IPoliceCharacter extends ICharacter {
  readonly rank: PoliceRank;
  readonly unitId: string;
  readonly squadId: string;
  readonly isOnDuty: boolean;
  readonly hasShield: boolean;
  readonly hasBaton: boolean;
  readonly hasMegaphone: boolean;
  readonly hasTeargasLauncher: boolean;
  readonly arrestCount: number;
  readonly forceUsed: number;
  readonly commandsReceived: readonly string[];
}

export interface ICivilianCharacter extends ICharacter {
  readonly occupation: string;
  readonly homeLocation: IVector3D;
  readonly destinationLocation: IVector3D | null;
  readonly isProtester: boolean;
  readonly protestReason: string | null;
  readonly complianceLevel: number;
  readonly hasRecordedIncident: boolean;
  readonly witnessedEvents: readonly string[];
}

export interface IProtesterCharacter extends ICivilianCharacter {
  readonly isAggressive: boolean;
  readonly protestGroupId: string;
  readonly signText: string | null;
  readonly chantParticipation: number;
  readonly violenceThreshold: number;
  readonly hasProjectile: boolean;
  readonly throwingAccuracy: number;
}

export interface ICharacterSpawnConfig {
  readonly type: CharacterType;
  readonly position: IVector3D;
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number };
  readonly initialState?: CharacterState;
  readonly customAttributes?: Partial<ICharacterAttributes>;
}

export interface ICharacterGroup {
  readonly id: string;
  readonly name: string;
  readonly leaderIds: readonly string[];
  readonly memberIds: readonly string[];
  readonly formationType: string;
  readonly targetPosition: IVector3D | null;
  readonly groupMorale: number;
  readonly groupAggression: number;
}

export interface ICharacterInteraction {
  readonly id: string;
  readonly initiatorId: string;
  readonly targetId: string;
  readonly type: string;
  readonly startTime: number;
  readonly duration: number;
  readonly isComplete: boolean;
  readonly result: string | null;
}

export interface ICharacterAnimation {
  readonly name: string;
  readonly duration: number;
  readonly loop: boolean;
  readonly blendInTime: number;
  readonly blendOutTime: number;
  readonly events: readonly { time: number; name: string }[];
}

// ═══════════════════════════════════════════════════════════════════
// KONSTANTEN - PFLICHT
// ═══════════════════════════════════════════════════════════════════

export const DEFAULT_CHARACTER_ATTRIBUTES: Readonly<Record<CharacterType, ICharacterAttributes>> = {
  [CharacterType.POLICE_OFFICER]: {
    health: 100, maxHealth: 100, stamina: 100, maxStamina: 100,
    morale: 80, maxMorale: 100, speed: 5.0, baseSpeed: 5.0,
    awareness: 70, aggression: 30, fear: 20, obedience: 90
  },
  [CharacterType.POLICE_COMMANDER]: {
    health: 100, maxHealth: 100, stamina: 80, maxStamina: 80,
    morale: 95, maxMorale: 100, speed: 4.5, baseSpeed: 4.5,
    awareness: 90, aggression: 25, fear: 10, obedience: 95
  },
  [CharacterType.RIOT_POLICE]: {
    health: 120, maxHealth: 120, stamina: 90, maxStamina: 90,
    morale: 85, maxMorale: 100, speed: 4.0, baseSpeed: 4.0,
    awareness: 75, aggression: 50, fear: 15, obedience: 95
  },
  [CharacterType.POLICE_MEDIC]: {
    health: 80, maxHealth: 80, stamina: 100, maxStamina: 100,
    morale: 90, maxMorale: 100, speed: 5.5, baseSpeed: 5.5,
    awareness: 85, aggression: 10, fear: 25, obedience: 90
  },
  [CharacterType.CIVILIAN]: {
    health: 80, maxHealth: 80, stamina: 70, maxStamina: 70,
    morale: 50, maxMorale: 100, speed: 4.0, baseSpeed: 4.0,
    awareness: 40, aggression: 10, fear: 50, obedience: 60
  },
  [CharacterType.PROTESTER_PEACEFUL]: {
    health: 80, maxHealth: 80, stamina: 80, maxStamina: 80,
    morale: 70, maxMorale: 100, speed: 4.0, baseSpeed: 4.0,
    awareness: 50, aggression: 15, fear: 40, obedience: 40
  },
  [CharacterType.PROTESTER_AGGRESSIVE]: {
    health: 90, maxHealth: 90, stamina: 90, maxStamina: 90,
    morale: 80, maxMorale: 100, speed: 4.5, baseSpeed: 4.5,
    awareness: 55, aggression: 70, fear: 25, obedience: 20
  },
  [CharacterType.JOURNALIST]: {
    health: 70, maxHealth: 70, stamina: 80, maxStamina: 80,
    morale: 75, maxMorale: 100, speed: 5.0, baseSpeed: 5.0,
    awareness: 95, aggression: 5, fear: 35, obedience: 50
  }
} as const;

export const CHARACTER_POLYGON_REQUIREMENTS: Readonly<Record<CharacterType, number>> = {
  [CharacterType.POLICE_OFFICER]: 28000,
  [CharacterType.POLICE_COMMANDER]: 35000,
  [CharacterType.RIOT_POLICE]: 32000,
  [CharacterType.POLICE_MEDIC]: 29000,
  [CharacterType.CIVILIAN]: 25000,
  [CharacterType.PROTESTER_PEACEFUL]: 26000,
  [CharacterType.PROTESTER_AGGRESSIVE]: 27000,
  [CharacterType.JOURNALIST]: 26000
} as const;

export const MOVEMENT_SPEEDS = {
  WALK: 2.0,
  RUN: 5.0,
  SPRINT: 8.0,
  CROUCH: 1.0,
  INJURED: 0.5
} as const;

// VALIDIERUNGS-MARKER
export const TYPE_002_VALIDATION = {
  fileId: 'TYPE-002',
  checksum: 'CC-TYPE-002-A1B2C3D4',
  enums: 6,
  interfaces: 15,
  constants: 3,
  validated: false
} as const;
```

**VALIDIERUNG TYPE-002:**
- [ ] Datei existiert: `/src/types/character.types.ts`
- [ ] Alle 6 Enums implementiert
- [ ] Alle 15 Interfaces implementiert
- [ ] TYPE_002_VALIDATION Marker am Ende

---

### B3. src/types/crowd.types.ts [PFLICHT-ID: TYPE-004]
**Checksum: CC-TYPE-004-I9J0K1L2**
**Mindestzeilen: 280**

```typescript
/**
 * @file crowd.types.ts
 * @validation VAL-TYPE-004
 * @checksum CC-TYPE-004-I9J0K1L2
 */

import { IVector3D, IBounds } from './game.types';

// ENUMS - ALLE 5 PFLICHT
export enum CrowdState {
  CALM = 'CALM',
  RESTLESS = 'RESTLESS',
  AGITATED = 'AGITATED',
  HOSTILE = 'HOSTILE',
  PANICKED = 'PANICKED',
  DISPERSING = 'DISPERSING',
  RIOTING = 'RIOTING'
}

export enum CrowdMovementType {
  STATIC = 'STATIC',
  WANDERING = 'WANDERING',
  MARCHING = 'MARCHING',
  RUSHING = 'RUSHING',
  FLEEING = 'FLEEING',
  STAMPEDE = 'STAMPEDE'
}

export enum CrowdDensityLevel {
  SPARSE = 'SPARSE',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  DENSE = 'DENSE',
  CRITICAL = 'CRITICAL'
}

export enum CrowdEventType {
  CHANTING_START = 'CHANTING_START',
  CHANTING_STOP = 'CHANTING_STOP',
  AGGRESSION_SPIKE = 'AGGRESSION_SPIKE',
  PANIC_OUTBREAK = 'PANIC_OUTBREAK',
  LEADER_EMERGED = 'LEADER_EMERGED',
  LEADER_ARRESTED = 'LEADER_ARRESTED',
  VIOLENCE_ERUPTED = 'VIOLENCE_ERUPTED',
  DISPERSAL_STARTED = 'DISPERSAL_STARTED',
  REGROUPING = 'REGROUPING',
  CALM_RESTORED = 'CALM_RESTORED'
}

export enum InfluenceType {
  TEAR_GAS = 'TEAR_GAS',
  WATER_CANNON = 'WATER_CANNON',
  POLICE_PRESENCE = 'POLICE_PRESENCE',
  ARREST = 'ARREST',
  VIOLENCE = 'VIOLENCE',
  SPEECH = 'SPEECH',
  MEDIA_PRESENCE = 'MEDIA_PRESENCE',
  BARRIER = 'BARRIER'
}

// INTERFACES - ALLE 15 PFLICHT
export interface ICrowdSector {
  readonly id: string;
  readonly bounds: IBounds;
  readonly center: IVector3D;
  readonly npcIds: readonly string[];
  readonly density: number;
  readonly densityLevel: CrowdDensityLevel;
  readonly averageVelocity: IVector3D;
  readonly averageAggression: number;
  readonly averageFear: number;
  readonly dominantState: CrowdState;
  readonly isHotspot: boolean;
  readonly lastUpdateTime: number;
}

export interface IInfluenceZone {
  readonly id: string;
  readonly type: InfluenceType;
  readonly position: IVector3D;
  readonly radius: number;
  readonly intensity: number;
  readonly decayRate: number;
  readonly creationTime: number;
  readonly expirationTime: number | null;
  readonly sourceEntityId: string | null;
  readonly affectedNPCIds: readonly string[];
}

export interface ICrowdMood {
  readonly overallAggression: number;
  readonly overallFear: number;
  readonly overallMorale: number;
  readonly chantingIntensity: number;
  readonly cohesion: number;
  readonly volatility: number;
  readonly tippingPoint: number;
  readonly recoveryRate: number;
}

export interface ICrowdStatistics {
  readonly totalCount: number;
  readonly peacefulCount: number;
  readonly aggressiveCount: number;
  readonly fleeingCount: number;
  readonly injuredCount: number;
  readonly arrestedCount: number;
  readonly averageSpeed: number;
  readonly spreadRadius: number;
  readonly densityMap: Readonly<Record<string, number>>;
}

export interface ICrowdLeader {
  readonly npcId: string;
  readonly influenceRadius: number;
  readonly followerCount: number;
  readonly charismaLevel: number;
  readonly isActive: boolean;
  readonly leadingSince: number;
}

export interface ICrowdEvent {
  readonly id: string;
  readonly type: CrowdEventType;
  readonly position: IVector3D;
  readonly timestamp: number;
  readonly affectedSectorIds: readonly string[];
  readonly triggerEntityId: string | null;
  readonly intensity: number;
  readonly duration: number;
  readonly data: Record<string, unknown>;
}

export interface ICrowdSimulationParams {
  readonly maxNPCs: number;
  readonly sectorSize: number;
  readonly updateInterval: number;
  readonly neighborhoodRadius: number;
  readonly separationWeight: number;
  readonly alignmentWeight: number;
  readonly cohesionWeight: number;
  readonly avoidanceWeight: number;
  readonly goalWeight: number;
  readonly panicSpreadRate: number;
  readonly aggressionSpreadRate: number;
  readonly recoveryRate: number;
}

export interface ICrowdFlowVector {
  readonly position: IVector3D;
  readonly direction: IVector3D;
  readonly magnitude: number;
  readonly sampleCount: number;
  readonly timestamp: number;
}

export interface ICrowdHeatmap {
  readonly resolution: number;
  readonly bounds: IBounds;
  readonly data: readonly number[][];
  readonly maxValue: number;
  readonly updateTime: number;
}

export interface ICrowdBarrier {
  readonly id: string;
  readonly type: 'physical' | 'police_line' | 'virtual';
  readonly startPosition: IVector3D;
  readonly endPosition: IVector3D;
  readonly strength: number;
  readonly isActive: boolean;
  readonly permeability: number;
}

export interface ICrowdControlAction {
  readonly id: string;
  readonly type: 'disperse' | 'contain' | 'redirect' | 'calm' | 'arrest_leader';
  readonly targetSectorIds: readonly string[];
  readonly intensity: number;
  readonly startTime: number;
  readonly duration: number;
  readonly executingUnitIds: readonly string[];
  readonly status: 'pending' | 'active' | 'completed' | 'failed';
  readonly effectiveness: number;
}

export interface ICrowdSystem {
  readonly id: string;
  readonly state: CrowdState;
  readonly movementType: CrowdMovementType;
  readonly sectors: readonly ICrowdSector[];
  readonly influenceZones: readonly IInfluenceZone[];
  readonly mood: ICrowdMood;
  readonly statistics: ICrowdStatistics;
  readonly leaders: readonly ICrowdLeader[];
  readonly events: readonly ICrowdEvent[];
  readonly flowVectors: readonly ICrowdFlowVector[];
  readonly heatmap: ICrowdHeatmap;
  readonly barriers: readonly ICrowdBarrier[];
  readonly activeActions: readonly ICrowdControlAction[];
  readonly simulationParams: ICrowdSimulationParams;
  readonly lastUpdateTime: number;
}

export interface ICrowdFormation {
  readonly id: string;
  readonly type: 'line' | 'wedge' | 'circle' | 'scatter';
  readonly centerPosition: IVector3D;
  readonly direction: IVector3D;
  readonly spacing: number;
  readonly memberIds: readonly string[];
}

export interface ICrowdWaypoint {
  readonly id: string;
  readonly position: IVector3D;
  readonly radius: number;
  readonly waitTime: number;
  readonly nextWaypointId: string | null;
  readonly conditions: readonly string[];
}

// KONSTANTEN
export const DEFAULT_CROWD_PARAMS: ICrowdSimulationParams = {
  maxNPCs: 500,
  sectorSize: 20,
  updateInterval: 0.1,
  neighborhoodRadius: 5,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
  avoidanceWeight: 2.0,
  goalWeight: 0.8,
  panicSpreadRate: 0.3,
  aggressionSpreadRate: 0.2,
  recoveryRate: 0.05
} as const;

export const DENSITY_THRESHOLDS = {
  SPARSE: 0.1,
  LIGHT: 0.3,
  MODERATE: 0.5,
  DENSE: 0.7,
  CRITICAL: 0.9
} as const;

export const MOOD_THRESHOLDS = {
  CALM_MAX_AGGRESSION: 0.2,
  RESTLESS_MAX_AGGRESSION: 0.4,
  AGITATED_MAX_AGGRESSION: 0.6,
  HOSTILE_MAX_AGGRESSION: 0.8,
  PANIC_FEAR_THRESHOLD: 0.7,
  RIOT_AGGRESSION_THRESHOLD: 0.85
} as const;

// VALIDIERUNGS-MARKER
export const TYPE_004_VALIDATION = {
  fileId: 'TYPE-004',
  checksum: 'CC-TYPE-004-I9J0K1L2',
  enums: 5,
  interfaces: 15,
  constants: 3,
  validated: false
} as const;
```

**VALIDIERUNG TYPE-004:**
- [ ] Datei existiert: `/src/types/crowd.types.ts`
- [ ] Alle 5 Enums implementiert
- [ ] Alle 15 Interfaces implementiert
- [ ] TYPE_004_VALIDATION Marker am Ende

---

## SEKTION C: STORES [120 Pflichtpunkte]

### C1. src/stores/gameStore.ts [PFLICHT-ID: STORE-001]
**Checksum: CC-STORE-001-U1V2W3X4**
**Mindestzeilen: 400**
**Pflicht-State: 16 Properties**
**Pflicht-Actions: 28**

**VALIDIERUNG STORE-001:**
- [ ] Datei existiert: `/src/stores/gameStore.ts`
- [ ] Zustand mit immer middleware
- [ ] 16 State-Properties
- [ ] 28 Actions
- [ ] 15 Selektoren

---

## SEKTION D: ORDNERSTRUKTUR [50 Pflichtordner]

```
/corona-control
├── /src
│   ├── /components
│   │   ├── /three        [PFLICHT-DIR-001]
│   │   ├── /characters   [PFLICHT-DIR-002]
│   │   ├── /vehicles     [PFLICHT-DIR-003]
│   │   ├── /environment  [PFLICHT-DIR-004]
│   │   ├── /effects      [PFLICHT-DIR-005]
│   │   └── /ui           [PFLICHT-DIR-006]
│   ├── /systems          [PFLICHT-DIR-007]
│   ├── /stores           [PFLICHT-DIR-008]
│   ├── /types            [PFLICHT-DIR-009]
│   ├── /shaders          [PFLICHT-DIR-010]
│   ├── /hooks            [PFLICHT-DIR-011]
│   ├── /utils            [PFLICHT-DIR-012]
│   ├── /constants        [PFLICHT-DIR-013]
│   └── /data
│       ├── /levels       [PFLICHT-DIR-014]
│       └── /vienna       [PFLICHT-DIR-015]
├── /assets
│   ├── /models
│   │   ├── /characters
│   │   │   ├── /police   [PFLICHT-DIR-016]
│   │   │   ├── /civilians[PFLICHT-DIR-017]
│   │   │   └── /protesters[PFLICHT-DIR-018]
│   │   ├── /vehicles     [PFLICHT-DIR-019]
│   │   ├── /equipment    [PFLICHT-DIR-020]
│   │   └── /environment
│   │       ├── /buildings[PFLICHT-DIR-021]
│   │       └── /props    [PFLICHT-DIR-022]
│   └── /audio
│       ├── /music        [PFLICHT-DIR-023]
│       ├── /sfx          [PFLICHT-DIR-024]
│       └── /voice        [PFLICHT-DIR-025]
├── /scripts              [PFLICHT-DIR-026]
└── /docs                 [PFLICHT-DIR-027]
```

---

## SEKTION E: VALIDIERUNGS-SCRIPT [PFLICHT]

### scripts/validate-implementation.js [PFLICHT-ID: SCRIPT-001]
**Checksum: CC-SCRIPT-001-C9D0E1F2**

```javascript
/**
 * @file validate-implementation.js
 * @description Automatisches Validierungsscript
 * @validation VAL-SCRIPT-001
 * @checksum CC-SCRIPT-001-C9D0E1F2
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = {
  'package.json': { checksum: 'CC-PKG-001-A7B3C9D2E1F4', minLines: 50 },
  'tsconfig.json': { checksum: 'CC-TSC-001-B8C4D0E2F6G3', minLines: 30 },
  'src/types/game.types.ts': { checksum: 'CC-TYPE-001-T3U4V5W6', minLines: 250 },
  'src/types/character.types.ts': { checksum: 'CC-TYPE-002-A1B2C3D4', minLines: 350 },
  'src/types/crowd.types.ts': { checksum: 'CC-TYPE-004-I9J0K1L2', minLines: 250 },
  'src/stores/gameStore.ts': { checksum: 'CC-STORE-001-U1V2W3X4', minLines: 350 }
};

const REQUIRED_DIRS = [
  'src/components/three',
  'src/components/characters',
  'src/components/vehicles',
  'src/components/environment',
  'src/components/effects',
  'src/components/ui',
  'src/systems',
  'src/stores',
  'src/types',
  'src/shaders',
  'src/hooks',
  'src/utils',
  'src/constants',
  'src/data/levels',
  'src/data/vienna',
  'scripts',
  'docs'
];

function validateFile(filePath, requirements) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { status: 'MISSING', message: `Datei fehlt: ${filePath}` };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lineCount = content.split('\n').length;
  
  if (lineCount < requirements.minLines) {
    return { 
      status: 'INCOMPLETE', 
      message: `${filePath}: ${lineCount}/${requirements.minLines} Zeilen` 
    };
  }
  
  if (requirements.checksum) {
    const hasChecksum = content.includes(requirements.checksum);
    if (!hasChecksum) {
      return { 
        status: 'NO_CHECKSUM', 
        message: `${filePath}: Checksum ${requirements.checksum} fehlt` 
      };
    }
  }
  
  return { status: 'PASSED', message: `${filePath}: OK (${lineCount} Zeilen)` };
}

function validateDirectory(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   CORONA CONTROL - IMPLEMENTIERUNGS-VALIDATOR');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  let passed = 0;
  let failed = 0;
  
  // Dateien prüfen
  console.log('📄 PFLICHT-DATEIEN:\n');
  for (const [file, req] of Object.entries(REQUIRED_FILES)) {
    const result = validateFile(file, req);
    if (result.status === 'PASSED') {
      console.log(`  ✅ ${result.message}`);
      passed++;
    } else {
      console.log(`  ❌ ${result.message}`);
      failed++;
    }
  }
  
  // Ordner prüfen
  console.log('\n📁 PFLICHT-ORDNER:\n');
  for (const dir of REQUIRED_DIRS) {
    if (validateDirectory(dir)) {
      console.log(`  ✅ ${dir}`);
      passed++;
    } else {
      console.log(`  ❌ ${dir} FEHLT`);
      failed++;
    }
  }
  
  // Ergebnis
  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   ERGEBNIS: ${passed}/${total} (${percentage}%)`);
  console.log(`   STATUS: ${failed === 0 ? '✅ VOLLSTÄNDIG' : '❌ UNVOLLSTÄNDIG'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  process.exit(failed === 0 ? 0 : 1);
}

main();
```

---

# 📊 MASTER-VALIDIERUNGS-TABELLE

| ID | Datei/Ordner | Typ | Checksum | Min-Zeilen | Status |
|----|--------------|-----|----------|------------|--------|
| PKG-001 | package.json | Config | CC-PKG-001-A7B3C9D2E1F4 | 50 | ☐ |
| TSC-001 | tsconfig.json | Config | CC-TSC-001-B8C4D0E2F6G3 | 30 | ☐ |
| APP-001 | app.json | Config | CC-APP-001-X9Y8Z7W6 | 40 | ☐ |
| TYPE-001 | src/types/game.types.ts | Types | CC-TYPE-001-T3U4V5W6 | 300 | ☐ |
| TYPE-002 | src/types/character.types.ts | Types | CC-TYPE-002-A1B2C3D4 | 400 | ☐ |
| TYPE-003 | src/types/npc.types.ts | Types | CC-TYPE-003-E5F6G7H8 | 350 | ☐ |
| TYPE-004 | src/types/crowd.types.ts | Types | CC-TYPE-004-I9J0K1L2 | 280 | ☐ |
| TYPE-010 | src/types/moral.types.ts | Types | CC-TYPE-010-M3N4O5P6 | 300 | ☐ |
| STORE-001 | src/stores/gameStore.ts | Store | CC-STORE-001-U1V2W3X4 | 400 | ☐ |
| STORE-003 | src/stores/crowdStore.ts | Store | CC-STORE-003-Y5Z6A7B8 | 350 | ☐ |
| SCRIPT-001 | scripts/validate-implementation.js | Script | CC-SCRIPT-001-C9D0E1F2 | 100 | ☐ |

---

# 🚨 ABSCHLUSS-DEKLARATION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    VERBINDLICHE IMPLEMENTIERUNGS-PFLICHT                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Dieser Dokumentation definiert VERBINDLICH alle Anforderungen für die      ║
║  100% vollständige Implementierung des Corona Control Spiels.               ║
║                                                                              ║
║  PRÜFKRITERIEN FÜR VOLLSTÄNDIGKEIT:                                         ║
║                                                                              ║
║  ✓ Jede Pflicht-Datei MUSS existieren                                       ║
║  ✓ Jede Datei MUSS mindestens die angegebenen Zeilen enthalten              ║
║  ✓ Alle Validation-Checksums MÜSSEN im Code vorhanden sein                  ║
║  ✓ Alle Enums MÜSSEN vollständig mit allen Werten implementiert sein        ║
║  ✓ Alle Interfaces MÜSSEN alle Pflichtfelder enthalten                      ║
║  ✓ Alle Store-Actions MÜSSEN funktional implementiert sein                  ║
║  ✓ Das Validierungs-Script MUSS fehlerfrei durchlaufen                      ║
║  ✓ TypeScript-Kompilierung MUSS ohne Fehler erfolgen                        ║
║                                                                              ║
║  NACHWEIS DER IMPLEMENTIERUNG:                                               ║
║                                                                              ║
║  1. Alle Dateien mit korrekten Checksums                                    ║
║  2. Validierungs-Script zeigt 100% Completion                               ║
║  3. TypeScript kompiliert fehlerfrei                                        ║
║  4. Alle Marker (TYPE_XXX_VALIDATION) vorhanden                             ║
║                                                                              ║
║  BEI UNVOLLSTÄNDIGER IMPLEMENTIERUNG:                                        ║
║                                                                              ║
║  → Automatische Ablehnung der Lieferung                                     ║
║  → Vollständige Neuimplementierung erforderlich                             ║
║  → Keine Teillieferungen werden akzeptiert                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**DOKUMENT-INFORMATIONEN:**

| Feld | Wert |
|------|------|
| Dokument-ID | `CC-MEGA-IMPL-001` |
| Version | `2.0.0` |
| Checksum | `CC-DOC-FINAL-MEGA-X1Y2Z3` |
| Erstellungsdatum | 2025-01-04 |
| Gesamtzeilen | ~2500 |
| Pflicht-Dateien | 89+ |
| Pflicht-Ordner | 27+ |
| Validierungs-Checksums | 11 |

---

*Dieses Dokument ist die verbindliche Referenz für die vollständige Implementierung.*
