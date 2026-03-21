import { NPCData } from './PoliceShiftManager.js';

export class StoryManager24h {
  private eventsTriggered: Set<string> = new Set();
  
  public evaluateEvents(gameSeconds: number, currentPool: Record<string, NPCData>): { npcs: Record<string, NPCData>, actions: string[], bakeryState: string } {
    const currentHour = Math.floor(gameSeconds / 3600) % 24;
    const currentMinute = Math.floor((gameSeconds % 3600) / 60);
    const newPool = { ...currentPool };
    const actions: string[] = [];
    let bakeryState = 'CLOSED';

    // Helper zur einmaligen Ausführung
    const trigger = (id: string, condition: boolean, action: () => void) => {
      if (condition && !this.eventsTriggered.has(id)) {
        action();
        this.eventsTriggered.add(id);
      }
    };

    // 06:00 - Morgen-Routinen (Tag erwacht)
    if (currentHour >= 6 && currentHour < 20) {
      bakeryState = 'OPEN';
    }

    trigger('0600_MORNING', currentHour === 6 && currentMinute === 0, () => {
      actions.push('🌅 06:00: Die Stadt erwacht.');
      for (let i = 0; i < 15; i++) {
        newPool[`civ_morning_${i}`] = {
           id: `civ_morning_${i}`, position: [(Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10], action: 'WANDER', mood: 'NEUTRAL', type: 'civilian'
        };
      }
    });

    // 07:00 - Rush Hour
    trigger('0700_RUSH_HOUR', currentHour === 7 && currentMinute === 0, () => {
      actions.push('☀️ 07:00: Rush Hour beginnt. Verkehr nimmt zu.');
      for (let i = 0; i < 20; i++) {
        newPool[`civ_rush_${i}`] = {
           id: `civ_rush_${i}`, position: [10, 0, (Math.random() - 0.5) * 5], action: 'JOG', mood: 'HURRIED', type: 'civilian'
        };
      }
    });

    // 08:00 - Erste Demonstranten treffen ein
    trigger('0800_DEMO_START', currentHour === 8 && currentMinute === 0, () => {
      actions.push('🔈 08:00: Erste Demonstranten versammeln sich & Bühne wird aufgebaut.');
      actions.push('🚔 08:00: Spezial-Auftrag für Polizist "Blue01" - Bewachung der Bühne am Stephansplatz.');
      
      // Verdrahteter Mission-NPC: Typ Police, Farbe Blau (implizit durch Typ), Auftrag an Ort [0,0,-5]
      newPool[`cop_0800_mission`] = {
         id: `cop_0800_mission`, position: [0, 0, -5], action: 'PATROL', mood: 'FOCUSED', type: 'Police'
      };

      // Spawn 10 Demonstrators
      for (let i = 0; i < 10; i++) {
        newPool[`demo_early_${i}`] = {
           id: `demo_early_${i}`, position: [-5 + (Math.random() * 3), 0, -5 + (Math.random() * 3)], action: 'IDLE', mood: 'PEACEFUL', type: 'demonstrator'
        };
      }
    });

    // 10:00 - Demo wächst an
    trigger('1000_DEMO_GROWTH', currentHour === 10 && currentMinute === 0, () => {
      actions.push('📢 10:00: Massenzustrom! Sprechchöre beginnen.');
      for (let i = 0; i < 50; i++) {
        newPool[`demo_mass_${i}`] = {
           id: `demo_mass_${i}`, position: [-8 + (Math.random() * 8), 0, -8 + (Math.random() * 8)], action: 'GATHER', mood: 'TENSE', type: 'demonstrator'
        };
      }
    });

    // 11:00 - Hauptredner
    trigger('1100_SPEAKER', currentHour === 11 && currentMinute === 0, () => {
      actions.push('🎙️ 11:00: Dr. Michael Hoffmann betritt die Bühne!');
      // Update alle Demonstranten auf ENTHUSIASTIC
      Object.keys(newPool).forEach(id => {
          if (newPool[id].type === 'demonstrator') newPool[id].mood = 'ENTHUSIASTIC';
      });
    });

    // 12:00 - Polizei-Ultimatum
    trigger('1200_ULTIMATUM', currentHour === 12 && currentMinute === 0, () => {
      actions.push('🚔 12:00: OBERST GRUBER: "Räumen Sie den Platz! Letzte Warnung!"');
      Object.keys(newPool).forEach(id => {
          if (newPool[id].type === 'demonstrator') {
            newPool[id].mood = 'ANGRY';
            newPool[id].action = 'PROTEST';
          }
      });
    });

    // 14:00 - Vorstoß der Räumung
    trigger('1400_CLEARING', currentHour === 14 && currentMinute === 0, () => {
      actions.push('💥 14:00: Eskalation & Polizei-Vorstoß beginnt!');
    });

    // 18:00 - Extremisten sammeln sich (Black Bloc)
    trigger('1800_EXTREMISTS', currentHour === 18 && currentMinute === 0, () => {
      actions.push('🌑 18:00: Dunkelheit bricht herein. Extremisten formieren sich in den Gassen.');
      for (let i = 0; i < 30; i++) {
        newPool[`extremist_${i}`] = {
           id: `extremist_${i}`, position: [12, 0, 12], action: 'RIOT', mood: 'ANGRY', type: 'demonstrator' // Black Bloc
        };
      }
    });

    // 19:30 - Bengalos
    trigger('1930_BENGALOS', currentHour === 19 && currentMinute === 30, () => {
      actions.push('🔥 19:30: Bengalos gezündet! Feuer bricht aus!');
    });

    return { npcs: newPool, actions, bakeryState };
  }
}

export const globalStoryManager = new StoryManager24h();
