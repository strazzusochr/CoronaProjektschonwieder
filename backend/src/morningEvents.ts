import { NPC } from './socialLogic.js';

export interface WorldEvent {
  time: string;
  action: () => void;
  executed: boolean;
}

// NPC Path definitions from Manifesto
const JOGGER_PATH: [number, number, number][] = [
  [127.5, 0, -89.2], [95.0, 0, -120.5], [45.2, 0, -135.8], [-12.0, 0, -128.3],
  [-45.5, 0, -95], [-38.2, 0, -45.6], [15.0, 0, -22.3], [68.5, 0, -35.0], [127.5, 0, -89.2]
];

const MARIA_PATH: [number, number, number][] = [[-45.8, 0, 23.1], [148.2, 0, 87.5]];
const HEINRICH_PATH: [number, number, number][] = [[78.3, 0, -156.2], [100.0, 0, -160.0], [120.0, 0, -150.0], [78.3, 0, -156.2]];


export function handleMorningEvents(currentSeconds: number, npcs: Record<string, NPC>) {
  const isTime = (h: number, m: number, s: number) => {
    const target = h * 3600 + m * 60 + s;
    return currentSeconds >= target && currentSeconds < target + 10;
  };

  const getExactSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

  // 1. NPC SPAWNS with Paths
  if (isTime(6, 0, 0) && !npcs['npc_jogger_stefan']) {
    npcs['npc_jogger_stefan'] = {
      id: 'npc_jogger_stefan',
      position: [127.5, 0, -89.2],
      action: 'JOGGING',
      mood: 'FOCUSED',
      type: 'civilian',
      path: JOGGER_PATH,
      pathIndex: 0
    };
    console.log('--- EVENT: JOGGER STEFAN SPAWNED with Path (06:00:00)');
  }

  if (isTime(6, 0, 15) && !npcs['npc_maria']) {
    npcs['npc_maria'] = {
      id: 'npc_maria',
      position: [-45.8, 0, 23.1],
      action: 'WALK_PURPOSEFUL',
      mood: 'TIRED',
      type: 'civilian',
      path: MARIA_PATH,
      pathIndex: 0
    };
  }

  if (isTime(6, 0, 30) && !npcs['npc_heinrich']) {
    npcs['npc_heinrich'] = {
      id: 'npc_heinrich',
      position: [78.3, 0, -156.2],
      action: 'WALK_SLOW',
      mood: 'HAPPY',
      type: 'civilian',
      path: HEINRICH_PATH,
      pathIndex: 0
    };
  }

  // 2. BAKERY GRANULAR SEQUENCE
  let bakeryState = 'CLOSED';
  const now = currentSeconds;
  if (now >= getExactSeconds(6, 0, 0)) bakeryState = 'LIGHTS_ON';
  if (now >= getExactSeconds(6, 0, 1)) bakeryState = 'FRANZ_ENTERS';
  if (now >= getExactSeconds(6, 0, 12)) bakeryState = 'DOOR_OPEN';
  if (now >= getExactSeconds(6, 0, 13)) bakeryState = 'FRANZ_IN_DOOR';
  if (now >= getExactSeconds(6, 0, 28)) bakeryState = 'OPEN';

  // 3. RUSH HOUR LOGIC (08:00 - 10:00)
  if (now >= getExactSeconds(8, 0, 0) && now < getExactSeconds(10, 0, 0)) {
    handleRushHour(now, npcs);
    if (bakeryState === 'OPEN') bakeryState = 'BREAKFAST_MENU';
  }

  // 4. WORKDAY & DEMO SETUP (10:00 - 12:00)
  if (now >= getExactSeconds(8, 0, 0) && now < getExactSeconds(12, 0, 0)) {
     handleDemoSetup(now, npcs);
  }

  return { npcs, bakeryState };
}

function handleDemoSetup(now: number, npcs: Record<string, NPC>) {
  // Spawn Martin Schneider (Fahnenträger)
  if (!npcs['npc_martin_schneider']) {
    npcs['npc_martin_schneider'] = {
      id: 'npc_martin_schneider',
      position: [-23.5, 0, 12.3],
      action: 'WALK_PURPOSEFUL',
      mood: 'DETERMINED',
      type: 'protestor',
      path: [[-23.5, 0, 12.3], [0, 0, 45], [5, 0, 65]], // Heading to Stage
      pathIndex: 0
    };
    console.log('--- EVENT: MARTIN SCHNEIDER (DEMO_001) SPAWNED (08:00-10:00 Window)');
  }

  // Gradually increase protestors at stage after 10:00
  if (now >= 10 * 3600) {
    const protestorCount = Math.floor((now - 10 * 3600) / 120); // 1 new protestor every 2 minutes
    for (let i = 0; i < Math.min(protestorCount, 15); i++) {
        const id = `protestor_early_${i}`;
        if (!npcs[id]) {
            npcs[id] = {
                id,
                position: [5 + Math.random() * 10, 0, 65 + Math.random() * 10],
                action: 'HOLD_SIGN',
                mood: 'DETERMINED',
                type: 'protestor'
            };
        }
    }
    
    // Additional police presence
    for (let i = 0; i < 3; i++) {
        const id = `police_patrol_${i}`;
        if (!npcs[id]) {
            npcs[id] = {
                id,
                position: [-20 + i * 10, 0, 50],
                action: 'PATROL',
                mood: 'NEUTRAL',
                type: 'police'
            };
        }
    }
  }
}

function handleRushHour(now: number, npcs: Record<string, NPC>) {

  // Subway Arrival every 5 minutes (300s)
  const subwayInterval = 300;
  const lastArrival = Math.floor(now / subwayInterval) * subwayInterval;
  
  // Trigger arrival effects/spawns in a 10s window after interval
  if (now >= lastArrival && now < lastArrival + 10) {
    // Spawn 10 commuters per arrival if not already spawned for this interval

    for (let i = 0; i < 10; i++) {
      const id = `commuter_${lastArrival}_${i}`;
      if (!npcs[id]) {
        npcs[id] = {
          id,
          position: [-100 + Math.random() * 5, 0, 80 + Math.random() * 5], // Subway Exit A
          action: 'WALK_PURPOSEFUL',
          mood: 'TIRED',
          type: 'civilian',
          path: [[-100, 0, 80], [50, 0, 50], [150, 0, -50]], // Path to Office District
          pathIndex: 0
        };
      }
    }
  }
}

