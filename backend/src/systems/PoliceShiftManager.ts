export interface NPCData {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: string;
}

export const NPCMood = {
  CALM: 'CALM',
  TENSE: 'TENSE',
  ANGRY: 'ANGRY'
};

export const NPCBehavior = {
  PATROL: 'PATROL',
  WANDER: 'WANDER',
  IDLE: 'IDLE'
};

export interface ShiftSchedule {
  shiftId: string;
  startTime: number; // Hour (0-23)
  endTime: number;
  unitType: 'PATROL' | 'RIOT' | 'SPECIAL';
  numOfficers: number;
  spawnPoint: [number, number, number];
  rallyPoint: [number, number, number];
}

export const SHIFT_SCHEDULES: ShiftSchedule[] = [
  { shiftId: 'MORNING_PATROL', startTime: 6, endTime: 14, unitType: 'PATROL', numOfficers: 15, spawnPoint: [8, 0, 8], rallyPoint: [3, 0, 3] },
  { shiftId: 'DAY_RIOT', startTime: 12, endTime: 20, unitType: 'RIOT', numOfficers: 30, spawnPoint: [-8, 0, 8], rallyPoint: [-3, 0, 3] },
  { shiftId: 'NIGHT_PATROL', startTime: 20, endTime: 4, unitType: 'PATROL', numOfficers: 10, spawnPoint: [0, 0, -8], rallyPoint: [0, 0, -3] }
];

export class PoliceShiftManager {
  private activeShifts: Set<string> = new Set();
  
  public evaluateShifts(currentHour: number, currentNpcs: NPCData[]): { actions: string[], npcsToSpawn: Partial<NPCData>[], npcsToDespawn: string[] } {
    const actions: string[] = [];
    const npcsToSpawn: Partial<NPCData>[] = [];
    const npcsToDespawn: string[] = [];
    
    // Check for shift starts
    for (const schedule of SHIFT_SCHEDULES) {
      if (currentHour === schedule.startTime && !this.activeShifts.has(schedule.shiftId)) {
        this.activeShifts.add(schedule.shiftId);
        actions.push(`Shift Started: ${schedule.shiftId}. Deploying ${schedule.numOfficers} officers.`);
        
        for (let i = 0; i < schedule.numOfficers; i++) {
          npcsToSpawn.push({
            id: `cop_${schedule.shiftId}_${i}_${Date.now()}`,
            position: [
              schedule.spawnPoint[0] + (Math.random() * 4 - 2),
              0,
              schedule.spawnPoint[2] + (Math.random() * 4 - 2)
            ],
            type: schedule.unitType === 'RIOT' ? 'RiotCop' : 'Police',
            mood: NPCMood.CALM,
            action: NPCBehavior.PATROL
          });
        }
      }
      
      // Check for shift ends (tired officers)
      if (currentHour === schedule.endTime && this.activeShifts.has(schedule.shiftId)) {
         this.activeShifts.delete(schedule.shiftId);
         actions.push(`Shift Ended: ${schedule.shiftId}. Recalling officers.`);
         
         currentNpcs.forEach(npc => {
            if (npc.id.includes(schedule.shiftId)) {
               npcsToDespawn.push(npc.id);
            }
         });
      }
    }
    
    return { actions, npcsToSpawn, npcsToDespawn };
  }
}

export const globalShiftManager = new PoliceShiftManager();
