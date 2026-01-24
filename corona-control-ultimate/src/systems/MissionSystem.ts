
import QuestManager from '@/managers/QuestManager';

/**
 * MissionSystem
 * Steuerungssystem für die Quest/Missions-Architektur.
 * Verbindet den ECS-artigen GameSystem-Loop mit dem Singleton-basierten QuestManager.
 */
class MissionSystem {
    public update(delta: number) {
        // Delegiere Update-Logik an den QuestManager
        // getrennt von den UI-zentrierten Teilen der Quests
        QuestManager.getInstance().update(delta);
    }
}

export default new MissionSystem();
