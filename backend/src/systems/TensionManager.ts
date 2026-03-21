import { NPCData } from './PoliceShiftManager.js'; // Reusing the type definition

export class TensionManager {
  private currentTension: number = 0;
  private peakFired: boolean = false;

  public evaluateTension(npcs: NPCData[]): { tensionLevel: number, peakTriggerFired: boolean } {
    let tensionDelta = 0;
    let peakTriggerFired = false;

    // Calculate influence of current NPC population
    npcs.forEach(npc => {
      if (npc.type === 'demonstrator' || npc.mood === 'ANGRY' || npc.mood === 'TENSE') {
        tensionDelta += 0.5; // Escalation
      }
      
      if (['Police', 'official', 'RiotCop'].includes(npc.type)) {
        tensionDelta -= 0.8; // De-escalation (Police presence lowers tension)
      }
    });

    // Baseline drift towards 0
    if (tensionDelta === 0) tensionDelta = -0.1;

    // Apply delta and clamp between 0 and 100
    this.currentTension = Math.max(0, Math.min(100, this.currentTension + tensionDelta));

    // Phase 12 Trigger check
    if (this.currentTension >= 100 && !this.peakFired) {
      this.peakFired = true;
      peakTriggerFired = true; // Signal the main loop to start Phase 12 Peak Event
    } else if (this.currentTension < 80) {
      this.peakFired = false; // Reset if tension drops significantly
    }

    return { 
      tensionLevel: Math.round(this.currentTension), 
      peakTriggerFired 
    };
  }
  
  public getTension(): number {
    return Math.round(this.currentTension);
  }
}

export const globalTensionManager = new TensionManager();
