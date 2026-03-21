import { NPCData } from './PoliceShiftManager.js';

export function triggerPeakEvent(currentPool: Record<string, NPCData>): { npcs: Record<string, NPCData>, actions: string[] } {
  const newPool = { ...currentPool };
  
  // Optional: Panik erzeugen, indem einige Zivilisten despawnen oder alle in "FLEE" Modus gehen würden.
  // Wir spawnen nun The Wall of Law. 20 schwere RiotCops.
  
  const startZ = 8; // Starten im Hintergrund
  const startX = -10;

  for (let i = 0; i < 20; i++) {
    const sekId = `sek_riot_${i}_${Date.now()}`;
    newPool[sekId] = {
      id: sekId,
      position: [startX + i * 1.05, 0, startZ], // Nebeneinander aufgereiht
      action: 'SHIELD_WALL_ADVANCE', // Spezielles SEK Behavior
      mood: 'FOCUSED',
      type: 'RiotCop'
    };
  }

  return {
    npcs: newPool,
    actions: ['🚨 PEAK EVENT: SEC DEPLOYED 🚨']
  };
}
