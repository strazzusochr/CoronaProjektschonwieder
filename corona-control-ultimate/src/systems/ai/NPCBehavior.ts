import type { NPCData } from '@/types/npc';

// Hilfsfunktion für zufällige Position in Radius
const getRandomPositionInRadius = (center: [number, number, number], radius: number): [number, number, number] => {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return [
    center[0] + r * Math.cos(angle),
    center[1],
    center[2] + r * Math.sin(angle)
  ];
};

export const updateNPCBehavior = (npc: NPCData, delta: number, playerPos?: [number, number, number] | number[]): NPCData => {
    const newState = { ...npc };
    const speed = npc.type === 'RIOTER' ? 4.0 : npc.type === 'POLICE' ? 3.5 : 2.0;

    // Distanz zum Spieler
    let distToPlayer = 1000;
    if (playerPos && playerPos.length === 3) {
        const dx = playerPos[0] - npc.position[0];
        const dz = playerPos[2] - npc.position[2];
        distToPlayer = Math.sqrt(dx * dx + dz * dz);
    }

    // Zustands-Übergänge
    if (npc.type === 'RIOTER') {
        // Rioter Logik
        if (distToPlayer < 15 && playerPos && playerPos.length === 3) {
            // Spieler in der Nähe: Angreifen!
            newState.state = 'ATTACK';
            newState.target = playerPos as [number, number, number]; // Target ist der Spieler
        } else if (!newState.target || Math.random() < 0.02) {
             // Neues Ziel suchen (Aggressiv)
             newState.state = 'WALK';
             newState.target = getRandomPositionInRadius([0, 0, 0] as [number, number, number], 20);
        }
    } else if (npc.type === 'POLICE') {
        // Polizei Logik
        if (!newState.target || Math.random() < 0.01) {
            // Patrouille
            newState.state = 'WALK';
            // Versuchen "Chaos" zu finden (Simuliert durch Zufall oder Nähe zu Spieler)
            const center = (playerPos && playerPos.length === 3) ? (playerPos as [number, number, number]) : ([0,0,0] as [number, number, number]); 
            newState.target = getRandomPositionInRadius(center, 15);
        }
    } else {
        // Zivilisten
        // Flucht vor Riotern (simuliert durch Flucht vor Spieler wenn State=Panic)
        if (newState.state === 'PANIC') {
            speed * 1.5; // Schneller
            if (!newState.target || Math.random() < 0.1) {
                // Weg vom Spieler/Chaos
                // Einfach Random woanders hin
                 newState.target = getRandomPositionInRadius([0, 0, 0] as [number, number, number], 45);
            }
            // Beruhigen nach Zeit?
            if (Math.random() < 0.005) newState.state = 'IDLE';
        } else if (!newState.target || Math.random() < 0.005) {
            newState.state = 'WALK';
            newState.target = getRandomPositionInRadius([0, 0, 0] as [number, number, number], 40);
        }
    }

    // Bewegung zum Ziel
    if (newState.target) {
        const dx = newState.target[0] - newState.position[0];
        const dz = newState.target[2] - newState.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.8) {
            // Ziel erreicht
            if (newState.state !== 'ATTACK') { // Bei Attack bleiben wir dran
               newState.target = undefined;
               newState.state = 'IDLE';
            }
        } else {
            // Bewegen implementation bleibt gleich
            const moveStep = speed * delta;
            const dirX = dx / dist;
            const dirZ = dz / dist;

            newState.position = [
                newState.position[0] + dirX * moveStep,
                newState.position[1],
                newState.position[2] + dirZ * moveStep
            ];

            // Rotation
            const targetRotation = Math.atan2(dirX, dirZ);
            let rotDiff = targetRotation - newState.rotation;
            if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            newState.rotation += rotDiff * 5 * delta;
        }
    }

    return newState;
};
