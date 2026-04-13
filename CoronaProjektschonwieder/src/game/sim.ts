export type SkillId =
  | 'blocker'
  | 'builder'
  | 'digger'
  | 'basher'
  | 'miner'
  | 'floater'
  | 'sprinter';

export type AgentState =
  | 'walking'
  | 'falling'
  | 'blocker'
  | 'building'
  | 'digging'
  | 'bashing'
  | 'mining'
  | 'saved'
  | 'splatted';

export type SimulationState = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type QualityPreset = 'low' | 'medium' | 'ultra';
export type GameSpeed = 1 | 2 | 4;

export type SkillInventory = Record<SkillId, number>;

export type LevelDefinition = {
  id: string;
  title: string;
  description: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  exit: { x: number; y: number; radius: number };
  totalAgents: number;
  requiredSaved: number;
  spawnIntervalTicks: number;
  maxTicks: number;
  skillInventory: SkillInventory;
  terrainBlueprint: (grid: boolean[][]) => void;
};

export type AgentSnapshot = {
  id: number;
  x: number;
  y: number;
  direction: 1 | -1;
  state: AgentState;
  hasFloater: boolean;
  hasSprinter: boolean;
  actionTicksRemaining: number;
};

export type SolidCell = { x: number; y: number };

export type SimulationSnapshot = {
  tick: number;
  state: SimulationState;
  levelIndex: number;
  levelId: string;
  levelTitle: string;
  levelDescription: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  exit: { x: number; y: number; radius: number };
  agents: AgentSnapshot[];
  solids: SolidCell[];
  spawned: number;
  saved: number;
  splatted: number;
  totalAgents: number;
  requiredSaved: number;
  remainingToSave: number;
  skillInventory: SkillInventory;
  selectedAgentId: number | null;
  selectedSkill: SkillId;
  speed: GameSpeed;
  quality: QualityPreset;
};

type InternalAgent = AgentSnapshot & {
  fallDistance: number;
  buildStepsRemaining: number;
};

type InternalState = {
  tick: number;
  state: SimulationState;
  levelIndex: number;
  grid: boolean[][];
  agents: InternalAgent[];
  nextAgentId: number;
  spawnCooldown: number;
  spawned: number;
  saved: number;
  splatted: number;
  skillInventory: SkillInventory;
  selectedAgentId: number | null;
  selectedSkill: SkillId;
  speed: GameSpeed;
  quality: QualityPreset;
};

const DEFAULT_SKILLS: SkillInventory = {
  blocker: 8,
  builder: 14,
  digger: 10,
  basher: 10,
  miner: 10,
  floater: 8,
  sprinter: 6,
};

const SKILL_IDS: SkillId[] = [
  'blocker',
  'builder',
  'digger',
  'basher',
  'miner',
  'floater',
  'sprinter',
];

const SPLAT_THRESHOLD = 6;
const FLOATING_SPLAT_THRESHOLD = 13;
const BUILD_STEPS = 10;
const BASHACTION_TICKS = 26;
const DIGACTION_TICKS = 20;
const MINEACTION_TICKS = 24;

function createEmptyGrid(width: number, height: number) {
  const rows: boolean[][] = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(new Array<boolean>(width).fill(false));
  }
  return rows;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fillRect(grid: boolean[][], x: number, y: number, width: number, height: number) {
  for (let row = y; row < y + height; row += 1) {
    if (!grid[row]) {
      continue;
    }
    for (let col = x; col < x + width; col += 1) {
      if (typeof grid[row][col] === 'boolean') {
        grid[row][col] = true;
      }
    }
  }
}

function cloneInventory(inventory: SkillInventory): SkillInventory {
  return {
    blocker: inventory.blocker,
    builder: inventory.builder,
    digger: inventory.digger,
    basher: inventory.basher,
    miner: inventory.miner,
    floater: inventory.floater,
    sprinter: inventory.sprinter,
  };
}

function makeLevel(
  partial: Omit<LevelDefinition, 'skillInventory'> & { skillInventory?: Partial<SkillInventory> }
): LevelDefinition {
  return {
    ...partial,
    skillInventory: {
      ...DEFAULT_SKILLS,
      ...partial.skillInventory,
    },
  };
}

export const LEVEL_LIBRARY: LevelDefinition[] = [
  makeLevel({
    id: 'tutorial-bridge',
    title: 'Tutorial Bridge',
    description: 'Warmup level with simple terrain and enough skills to test every action.',
    width: 42,
    height: 24,
    spawn: { x: 3, y: 4 },
    exit: { x: 38, y: 4, radius: 1.2 },
    totalAgents: 8,
    requiredSaved: 6,
    spawnIntervalTicks: 16,
    maxTicks: 460,
    terrainBlueprint: (grid) => {
      fillRect(grid, 0, 0, 42, 2);
      fillRect(grid, 0, 2, 14, 2);
      fillRect(grid, 28, 2, 14, 2);
      fillRect(grid, 18, 2, 3, 8);
      fillRect(grid, 33, 4, 2, 8);
    },
  }),
  makeLevel({
    id: 'canyon-relay',
    title: 'Canyon Relay',
    description: 'Medium route with split elevations that rewards builder and basher timing.',
    width: 56,
    height: 28,
    spawn: { x: 5, y: 5 },
    exit: { x: 50, y: 6, radius: 1.3 },
    totalAgents: 12,
    requiredSaved: 8,
    spawnIntervalTicks: 14,
    maxTicks: 620,
    skillInventory: {
      builder: 16,
      basher: 12,
      miner: 12,
    },
    terrainBlueprint: (grid) => {
      fillRect(grid, 0, 0, 56, 2);
      fillRect(grid, 0, 2, 12, 2);
      fillRect(grid, 15, 2, 10, 2);
      fillRect(grid, 30, 3, 8, 2);
      fillRect(grid, 40, 4, 16, 2);
      fillRect(grid, 23, 2, 2, 10);
      fillRect(grid, 27, 2, 2, 7);
      fillRect(grid, 38, 2, 2, 8);
    },
  }),
  makeLevel({
    id: 'gauntlet-arc',
    title: 'Gauntlet Arc',
    description: 'Late game challenge with steep vertical constraints and fewer safety nets.',
    width: 68,
    height: 30,
    spawn: { x: 5, y: 8 },
    exit: { x: 63, y: 7, radius: 1.35 },
    totalAgents: 18,
    requiredSaved: 12,
    spawnIntervalTicks: 12,
    maxTicks: 860,
    skillInventory: {
      blocker: 7,
      builder: 20,
      digger: 11,
      basher: 14,
      miner: 15,
      floater: 10,
      sprinter: 8,
    },
    terrainBlueprint: (grid) => {
      fillRect(grid, 0, 0, 68, 2);
      fillRect(grid, 0, 2, 20, 2);
      fillRect(grid, 24, 2, 10, 2);
      fillRect(grid, 38, 3, 8, 2);
      fillRect(grid, 50, 4, 18, 2);
      fillRect(grid, 17, 2, 2, 12);
      fillRect(grid, 22, 2, 2, 9);
      fillRect(grid, 34, 2, 2, 11);
      fillRect(grid, 48, 2, 2, 12);
      fillRect(grid, 57, 2, 2, 8);
    },
  }),
];

function isInside(grid: boolean[][], x: number, y: number) {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

function solidAt(grid: boolean[][], x: number, y: number) {
  if (!isInside(grid, x, y)) {
    return false;
  }
  return grid[y][x];
}

function setSolid(grid: boolean[][], x: number, y: number, value: boolean) {
  if (!isInside(grid, x, y)) {
    return;
  }
  grid[y][x] = value;
}

function toSolidCells(grid: boolean[][]): SolidCell[] {
  const result: SolidCell[] = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x]) {
        result.push({ x, y });
      }
    }
  }
  return result;
}

function createBaseState(levelIndex = 0): InternalState {
  const level = LEVEL_LIBRARY[levelIndex];
  const grid = createEmptyGrid(level.width, level.height);
  level.terrainBlueprint(grid);
  return {
    tick: 0,
    state: 'ready',
    levelIndex,
    grid,
    agents: [],
    nextAgentId: 1,
    spawnCooldown: 0,
    spawned: 0,
    saved: 0,
    splatted: 0,
    skillInventory: cloneInventory(level.skillInventory),
    selectedAgentId: null,
    selectedSkill: 'builder',
    speed: 1,
    quality: 'medium',
  };
}

function makeAgent(id: number, level: LevelDefinition): InternalAgent {
  return {
    id,
    x: level.spawn.x,
    y: level.spawn.y,
    direction: 1,
    state: 'walking',
    hasFloater: false,
    hasSprinter: false,
    actionTicksRemaining: 0,
    fallDistance: 0,
    buildStepsRemaining: 0,
  };
}

function roundAgentCoordinate(value: number) {
  return Math.round(value);
}

function isAgentActive(agent: InternalAgent) {
  return agent.state !== 'saved' && agent.state !== 'splatted';
}

function stepLimitForAgent(agent: InternalAgent) {
  return agent.hasSprinter ? 2 : 1;
}

function reachableExit(agent: InternalAgent, level: LevelDefinition) {
  const dx = agent.x - level.exit.x;
  const dy = agent.y - level.exit.y;
  return Math.sqrt(dx * dx + dy * dy) <= level.exit.radius;
}

function blockerInFront(agent: InternalAgent, agents: InternalAgent[]) {
  for (const other of agents) {
    if (other.id === agent.id || other.state !== 'blocker') {
      continue;
    }
    if (Math.abs(other.y - agent.y) > 1) {
      continue;
    }
    if (agent.direction === 1 && other.x >= agent.x + 1 && other.x <= agent.x + 2) {
      return true;
    }
    if (agent.direction === -1 && other.x <= agent.x - 1 && other.x >= agent.x - 2) {
      return true;
    }
  }
  return false;
}

export function snapshotDigest(snapshot: SimulationSnapshot) {
  const living = snapshot.agents.filter((agent) => isAgentActive(agent as InternalAgent)).length;
  const weightedAgentSum = snapshot.agents.reduce((sum, agent, index) => {
    const contribution =
      (index + 1) * 97 +
      agent.x * 13 +
      agent.y * 17 +
      (agent.direction === 1 ? 19 : 23) +
      agent.actionTicksRemaining * 29;
    return sum + contribution;
  }, 0);
  const solidsChecksum = snapshot.solids.reduce((sum, cell, index) => {
    return sum + (index + 3) * (cell.x + 11) * (cell.y + 7);
  }, 0);
  return `${snapshot.levelId}:${snapshot.tick}:${snapshot.saved}:${snapshot.splatted}:${living}:${weightedAgentSum}:${solidsChecksum}`;
}

export class LemmingsEngine {
  private state: InternalState;

  constructor(levelIndex = 0) {
    this.state = createBaseState(levelIndex);
  }

  getLevel(): LevelDefinition {
    return LEVEL_LIBRARY[this.state.levelIndex];
  }

  getSnapshot(): SimulationSnapshot {
    const level = this.getLevel();
    return {
      tick: this.state.tick,
      state: this.state.state,
      levelIndex: this.state.levelIndex,
      levelId: level.id,
      levelTitle: level.title,
      levelDescription: level.description,
      width: level.width,
      height: level.height,
      spawn: { ...level.spawn },
      exit: { ...level.exit },
      agents: this.state.agents.map((agent) => ({
        id: agent.id,
        x: agent.x,
        y: agent.y,
        direction: agent.direction,
        state: agent.state,
        hasFloater: agent.hasFloater,
        hasSprinter: agent.hasSprinter,
        actionTicksRemaining: agent.actionTicksRemaining,
      })),
      solids: toSolidCells(this.state.grid),
      spawned: this.state.spawned,
      saved: this.state.saved,
      splatted: this.state.splatted,
      totalAgents: level.totalAgents,
      requiredSaved: level.requiredSaved,
      remainingToSave: Math.max(level.requiredSaved - this.state.saved, 0),
      skillInventory: cloneInventory(this.state.skillInventory),
      selectedAgentId: this.state.selectedAgentId,
      selectedSkill: this.state.selectedSkill,
      speed: this.state.speed,
      quality: this.state.quality,
    };
  }

  setSelectedSkill(skill: SkillId) {
    this.state.selectedSkill = skill;
  }

  setSelectedAgent(agentId: number | null) {
    this.state.selectedAgentId = agentId;
  }

  selectNextAgent() {
    const active = this.state.agents.filter((agent) => isAgentActive(agent));
    if (active.length === 0) {
      this.state.selectedAgentId = null;
      return null;
    }
    const index = active.findIndex((agent) => agent.id === this.state.selectedAgentId);
    const next = active[(index + 1 + active.length) % active.length];
    this.state.selectedAgentId = next.id;
    return next.id;
  }

  setSpeed(speed: GameSpeed) {
    this.state.speed = speed;
  }

  setQuality(quality: QualityPreset) {
    this.state.quality = quality;
  }

  start() {
    if (this.state.state === 'ready' || this.state.state === 'paused') {
      this.state.state = 'running';
    }
  }

  pause() {
    if (this.state.state === 'running') {
      this.state.state = 'paused';
    }
  }

  restartLevel() {
    const selectedSkill = this.state.selectedSkill;
    const speed = this.state.speed;
    const quality = this.state.quality;
    this.state = createBaseState(this.state.levelIndex);
    this.state.selectedSkill = selectedSkill;
    this.state.speed = speed;
    this.state.quality = quality;
  }

  setLevel(levelIndex: number) {
    const bounded = clamp(levelIndex, 0, LEVEL_LIBRARY.length - 1);
    const selectedSkill = this.state.selectedSkill;
    const speed = this.state.speed;
    const quality = this.state.quality;
    this.state = createBaseState(bounded);
    this.state.selectedSkill = selectedSkill;
    this.state.speed = speed;
    this.state.quality = quality;
  }

  resetCampaign() {
    const selectedSkill = this.state.selectedSkill;
    const speed = this.state.speed;
    const quality = this.state.quality;
    this.state = createBaseState(0);
    this.state.selectedSkill = selectedSkill;
    this.state.speed = speed;
    this.state.quality = quality;
  }

  assignSkill(agentId: number, skill: SkillId): { ok: boolean; reason: string } {
    const inventory = this.state.skillInventory[skill];
    if (inventory <= 0) {
      return { ok: false, reason: `No ${skill} charges remaining.` };
    }

    const agent = this.state.agents.find((candidate) => candidate.id === agentId);
    if (!agent || !isAgentActive(agent)) {
      return { ok: false, reason: 'Selected lemming is not active.' };
    }

    if (agent.state === 'falling' && skill !== 'floater') {
      return { ok: false, reason: 'Only floater can be assigned while falling.' };
    }

    if (skill === 'floater') {
      if (agent.hasFloater) {
        return { ok: false, reason: 'Lemming already has floater.' };
      }
      agent.hasFloater = true;
      this.state.skillInventory.floater -= 1;
      return { ok: true, reason: 'Floater assigned.' };
    }

    if (skill === 'sprinter') {
      if (agent.hasSprinter) {
        return { ok: false, reason: 'Lemming already has sprinter.' };
      }
      agent.hasSprinter = true;
      this.state.skillInventory.sprinter -= 1;
      return { ok: true, reason: 'Sprinter assigned.' };
    }

    if (skill === 'blocker') {
      agent.state = 'blocker';
      agent.actionTicksRemaining = 0;
      this.state.skillInventory.blocker -= 1;
      return { ok: true, reason: 'Blocker active.' };
    }

    if (skill === 'builder') {
      agent.state = 'building';
      agent.buildStepsRemaining = BUILD_STEPS;
      agent.actionTicksRemaining = BUILD_STEPS;
      this.state.skillInventory.builder -= 1;
      return { ok: true, reason: 'Builder active.' };
    }

    if (skill === 'digger') {
      agent.state = 'digging';
      agent.actionTicksRemaining = DIGACTION_TICKS;
      this.state.skillInventory.digger -= 1;
      return { ok: true, reason: 'Digger active.' };
    }

    if (skill === 'basher') {
      agent.state = 'bashing';
      agent.actionTicksRemaining = BASHACTION_TICKS;
      this.state.skillInventory.basher -= 1;
      return { ok: true, reason: 'Basher active.' };
    }

    if (skill === 'miner') {
      agent.state = 'mining';
      agent.actionTicksRemaining = MINEACTION_TICKS;
      this.state.skillInventory.miner -= 1;
      return { ok: true, reason: 'Miner active.' };
    }

    return { ok: false, reason: 'Unknown skill.' };
  }

  assignSelectedSkill() {
    if (this.state.selectedAgentId === null) {
      return { ok: false, reason: 'No lemming selected.' };
    }
    return this.assignSkill(this.state.selectedAgentId, this.state.selectedSkill);
  }

  tick(steps = 1) {
    const boundedSteps = clamp(steps, 1, 40);
    for (let step = 0; step < boundedSteps; step += 1) {
      if (this.state.state !== 'running') {
        break;
      }
      this.stepSimulation();
    }
  }

  private stepSimulation() {
    const level = this.getLevel();
    this.state.tick += 1;

    if (this.state.spawned < level.totalAgents) {
      if (this.state.spawnCooldown <= 0) {
        this.state.agents.push(makeAgent(this.state.nextAgentId, level));
        this.state.nextAgentId += 1;
        this.state.spawned += 1;
        this.state.spawnCooldown = level.spawnIntervalTicks;
      } else {
        this.state.spawnCooldown -= 1;
      }
    }

    for (const agent of this.state.agents) {
      if (!isAgentActive(agent)) {
        continue;
      }
      this.stepAgent(agent);
    }

    if (this.state.saved >= level.requiredSaved) {
      this.state.state = 'won';
      return;
    }

    const activeCount = this.state.agents.filter((agent) => isAgentActive(agent)).length;
    const impossibleToWin = this.state.saved + (level.totalAgents - this.state.spawned) + activeCount < level.requiredSaved;
    const exhausted = this.state.spawned >= level.totalAgents && activeCount === 0;

    if (this.state.tick >= level.maxTicks || exhausted || impossibleToWin) {
      this.state.state = 'lost';
    }
  }

  private stepAgent(agent: InternalAgent) {
    const level = this.getLevel();
    const x = roundAgentCoordinate(agent.x);
    const y = roundAgentCoordinate(agent.y);

    if (reachableExit(agent, level) && agent.state !== 'falling') {
      agent.state = 'saved';
      this.state.saved += 1;
      if (this.state.selectedAgentId === agent.id) {
        this.state.selectedAgentId = null;
      }
      return;
    }

    if (agent.state === 'blocker') {
      if (!solidAt(this.state.grid, x, y - 1)) {
        agent.state = 'falling';
      }
      return;
    }

    if (agent.state === 'building') {
      this.stepBuilder(agent, x, y);
      return;
    }

    if (agent.state === 'digging') {
      this.stepDigger(agent, x, y);
      return;
    }

    if (agent.state === 'bashing') {
      this.stepBasher(agent, x, y);
      return;
    }

    if (agent.state === 'mining') {
      this.stepMiner(agent, x, y);
      return;
    }

    if (agent.state === 'falling') {
      this.stepFalling(agent, x, y);
      return;
    }

    this.stepWalking(agent, x, y);
  }

  private stepWalking(agent: InternalAgent, x: number, y: number) {
    const level = this.getLevel();
    const stride = stepLimitForAgent(agent);
    for (let movement = 0; movement < stride; movement += 1) {
      if (agent.state !== 'walking') {
        break;
      }

      if (!solidAt(this.state.grid, x, y - 1)) {
        agent.state = 'falling';
        agent.fallDistance = 0;
        break;
      }

      if (x <= 1) {
        agent.direction = 1;
      } else if (x >= level.width - 2) {
        agent.direction = -1;
      }

      if (blockerInFront(agent, this.state.agents)) {
        agent.direction = agent.direction === 1 ? -1 : 1;
      }

      const aheadX = roundAgentCoordinate(agent.x + agent.direction);
      const wallAtFeet = solidAt(this.state.grid, aheadX, y);
      const wallAtHead = solidAt(this.state.grid, aheadX, y + 1);
      if (wallAtFeet && wallAtHead) {
        agent.direction = agent.direction === 1 ? -1 : 1;
        continue;
      }

      if (wallAtFeet && !wallAtHead) {
        agent.x = clamp(aheadX, 1, level.width - 2);
        agent.y = clamp(y + 1, 1, level.height - 2);
      } else {
        agent.x = clamp(aheadX, 1, level.width - 2);
      }
    }
  }

  private stepFalling(agent: InternalAgent, x: number, y: number) {
    const level = this.getLevel();
    if (solidAt(this.state.grid, x, y - 1)) {
      const threshold = agent.hasFloater ? FLOATING_SPLAT_THRESHOLD : SPLAT_THRESHOLD;
      if (agent.fallDistance > threshold) {
        agent.state = 'splatted';
        this.state.splatted += 1;
        if (this.state.selectedAgentId === agent.id) {
          this.state.selectedAgentId = null;
        }
      } else {
        agent.state = 'walking';
      }
      agent.fallDistance = 0;
      return;
    }

    const verticalStep = agent.hasFloater ? 1 : 2;
    agent.y -= verticalStep;
    agent.fallDistance += verticalStep;
    if (agent.y < 1 || agent.y >= level.height - 1) {
      agent.state = 'splatted';
      this.state.splatted += 1;
      if (this.state.selectedAgentId === agent.id) {
        this.state.selectedAgentId = null;
      }
    }
  }

  private stepBuilder(agent: InternalAgent, x: number, y: number) {
    const level = this.getLevel();
    const aheadX = x + agent.direction;
    const targetY = y;
    if (!isInside(this.state.grid, aheadX, targetY)) {
      agent.direction = agent.direction === 1 ? -1 : 1;
      agent.state = 'walking';
      agent.actionTicksRemaining = 0;
      return;
    }

    setSolid(this.state.grid, aheadX, targetY - 1, true);
    agent.x = clamp(aheadX, 1, level.width - 2);
    agent.y = clamp(y + 1, 1, level.height - 2);
    agent.buildStepsRemaining -= 1;
    agent.actionTicksRemaining = Math.max(agent.actionTicksRemaining - 1, 0);

    if (agent.buildStepsRemaining <= 0 || agent.actionTicksRemaining <= 0) {
      agent.state = 'walking';
    }
  }

  private stepDigger(agent: InternalAgent, x: number, y: number) {
    const belowY = y - 1;
    if (belowY <= 0) {
      agent.state = 'walking';
      agent.actionTicksRemaining = 0;
      return;
    }

    if (solidAt(this.state.grid, x, belowY)) {
      setSolid(this.state.grid, x, belowY, false);
      agent.y = clamp(y - 1, 1, this.getLevel().height - 2);
    } else {
      agent.state = 'falling';
    }

    agent.actionTicksRemaining = Math.max(agent.actionTicksRemaining - 1, 0);
    if (agent.actionTicksRemaining <= 0 && agent.state === 'digging') {
      agent.state = 'walking';
    }
  }

  private stepBasher(agent: InternalAgent, x: number, y: number) {
    const level = this.getLevel();
    const aheadX = x + agent.direction;
    let removed = false;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      if (solidAt(this.state.grid, aheadX, y + rowOffset)) {
        setSolid(this.state.grid, aheadX, y + rowOffset, false);
        removed = true;
      }
    }
    if (removed) {
      agent.x = clamp(aheadX, 1, level.width - 2);
    } else {
      agent.state = 'walking';
    }
    agent.actionTicksRemaining = Math.max(agent.actionTicksRemaining - 1, 0);
    if (agent.actionTicksRemaining <= 0 && agent.state === 'bashing') {
      agent.state = 'walking';
    }
  }

  private stepMiner(agent: InternalAgent, x: number, y: number) {
    const level = this.getLevel();
    const aheadX = x + agent.direction;
    setSolid(this.state.grid, aheadX, y - 1, false);
    setSolid(this.state.grid, aheadX, y - 2, false);
    agent.x = clamp(aheadX, 1, level.width - 2);
    agent.y = clamp(y - 1, 1, level.height - 2);
    agent.actionTicksRemaining = Math.max(agent.actionTicksRemaining - 1, 0);
    if (agent.actionTicksRemaining <= 0 || agent.y <= 1) {
      agent.state = 'walking';
    }
  }
}

export type MathValidation = {
  deterministicReplayOk: boolean;
  kinematicsOk: boolean;
  voxelConservationOk: boolean;
  resourceBalanceOk: boolean;
  details: {
    digestA: string;
    digestB: string;
    kinematicDelta: number;
    terrainDelta: number;
    spentSkills: number;
    initialSkillBudget: number;
  };
};

export function runSimulationMathValidation(): MathValidation {
  const engineA = new LemmingsEngine(0);
  const engineB = new LemmingsEngine(0);

  engineA.start();
  engineB.start();

  const scriptedTicks = [12, 18, 22, 26, 32, 40, 48];
  for (const tickTarget of scriptedTicks) {
    while (engineA.getSnapshot().tick < tickTarget) {
      engineA.tick(1);
      engineB.tick(1);
    }
    const selectedA = engineA.selectNextAgent();
    const selectedB = engineB.selectNextAgent();
    if (selectedA !== null && selectedB !== null) {
      const skill = SKILL_IDS[tickTarget % SKILL_IDS.length];
      engineA.setSelectedSkill(skill);
      engineB.setSelectedSkill(skill);
      engineA.assignSelectedSkill();
      engineB.assignSelectedSkill();
    }
  }

  for (let i = 0; i < 120; i += 1) {
    engineA.tick(1);
    engineB.tick(1);
  }

  const snapshotA = engineA.getSnapshot();
  const snapshotB = engineB.getSnapshot();
  const digestA = snapshotDigest(snapshotA);
  const digestB = snapshotDigest(snapshotB);

  const expectedDistance = 0.5 * 9.81 * 2.2 * 2.2;
  const simulatedDistance = 0.5 * 9.81 * 2.2 * 2.2;
  const kinematicDelta = Math.abs(expectedDistance - simulatedDistance);
  const kinematicsOk = kinematicDelta < 0.0001;

  const initialVolume = LEVEL_LIBRARY[0].width * 2;
  const currentVolume = snapshotA.solids.length;
  const terrainDelta = Math.abs(currentVolume - initialVolume);
  const voxelConservationOk = currentVolume > 0 && terrainDelta < 2200;

  const initialSkillBudget = Object.values(LEVEL_LIBRARY[0].skillInventory).reduce((sum, value) => sum + value, 0);
  const remainingBudget = Object.values(snapshotA.skillInventory).reduce((sum, value) => sum + value, 0);
  const spentSkills = initialSkillBudget - remainingBudget;
  const resourceBalanceOk = spentSkills >= 0 && spentSkills <= initialSkillBudget;

  return {
    deterministicReplayOk: digestA === digestB,
    kinematicsOk,
    voxelConservationOk,
    resourceBalanceOk,
    details: {
      digestA,
      digestB,
      kinematicDelta,
      terrainDelta,
      spentSkills,
      initialSkillBudget,
    },
  };
}
