import { NPC } from './socialLogic.js';

export function handleRushHourEvents(currentSeconds: number, npcs: Record<string, NPC>) {
  const isTime = (h: number, m: number, s: number) => {
    const target = h * 3600 + m * 60 + s;
    return currentSeconds >= target && currentSeconds < target + 10;
  };

  // 1. LOGISTICS: DELIVERY TRUCK (06:45:00)
  if (isTime(6, 45, 0) && !npcs['npc_truck_bakery']) {
    npcs['npc_truck_bakery'] = {
      id: 'npc_truck_bakery',
      position: [55.0, 0, 42.0], // Vor der Bäckerei
      action: 'DELIVERY_UNLOADING',
      mood: 'BUSY',
      type: 'vehicle'
    };
    console.log('--- EVENT: BAKERY DELIVERY TRUCK ARRIVED (06:45:00)');
  }

  // 2. RUSH HOUR: COMMUTER WAVE (07:00:00)
  if (isTime(7, 0, 0)) {
    for (let i = 0; i < 20; i++) {
        const id = `npc_commuter_${i}`;
        if (!npcs[id]) {
            npcs[id] = {
                id,
                position: [-45 + Math.random() * 5, 0, 23 + Math.random() * 5], // U-Bahn Ausgang
                action: 'WALK_PURPOSEFUL',
                mood: 'STRESSED',
                type: 'civilian'
            };
        }
    }
    console.log('--- EVENT: RUSH HOUR COMMUTERS SPAWNED (07:00:00)');
  }

  return npcs;
}
