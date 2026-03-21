import { NPC } from './socialLogic.js';

export interface WorldEvent {
  time: string;
  action: () => void;
  executed: boolean;
}

export function handleMorningEvents(currentSeconds: number, npcs: Record<string, NPC>) {
  // 06:00:00 = 21600 Sekunden
  const isTime = (h: number, m: number, s: number) => {
    const target = h * 3600 + m * 60 + s;
    return currentSeconds >= target && currentSeconds < target + 10; // 10s Fenster für Triggern
  };

  // 1. NPC SPAWNS
  if (isTime(6, 0, 0) && !npcs['npc_jogger_stefan']) {
    npcs['npc_jogger_stefan'] = {
      id: 'npc_jogger_stefan',
      position: [127.5, 0, -89.2],
      action: 'JOGGING',
      mood: 'FOCUSED',
      type: 'civilian'
    };
    console.log('--- EVENT: JOGGER STEFAN SPAWNED (06:00:00)');
  }

  if (isTime(6, 0, 15) && !npcs['npc_maria']) {
    npcs['npc_maria'] = {
      id: 'npc_maria',
      position: [-45.8, 0, 23.1],
      action: 'WALK_PURPOSEFUL',
      mood: 'TIRED',
      type: 'civilian'
    };
    console.log('--- EVENT: OFFICE MARIA SPAWNED (06:00:15)');
  }

  if (isTime(6, 0, 30) && !npcs['npc_heinrich']) {
    npcs['npc_heinrich'] = {
      id: 'npc_heinrich',
      position: [78.3, 0, -156.2],
      action: 'WALK_SLOW',
      mood: 'HAPPY',
      type: 'civilian'
    };
    console.log('--- EVENT: HEINRICH & WALDI SPAWNED (06:00:30)');
  }

  // 2. BAKERY SEQUENCE
  let bakeryState = 'CLOSED';
  if (isTime(6, 0, 0)) bakeryState = 'LIGHTS_ON';
  if (isTime(6, 0, 12)) bakeryState = 'DOOR_OPEN';
  if (isTime(6, 0, 28)) bakeryState = 'OPEN';

  return { npcs, bakeryState };
}
