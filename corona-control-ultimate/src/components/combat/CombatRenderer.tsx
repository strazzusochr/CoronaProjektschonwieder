
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CombatSystem from '@/systems/CombatSystem';
import type { Projectile } from '@/systems/CombatSystem';
import * as THREE from 'three';

const CombatRenderer: React.FC = () => {
    // Wir können Instances für Performance nutzen, wenn es viele sind,
    // aber für jetzt reicht einfaches Mapping für geringe Anzahl.
    // Nutzen wir einen einfachen zustandslosen Ansatz, der vom System jeden Frame liest.

    // Eigentlich braucht React State, um Re-Renders auszulösen, wenn wir Komponenten mappen.
    // ABER für 3D wollen wir oft React Reconciler für jedes Frame-Update vermeiden.
    // Hybrider Ansatz: Eine einzelne Komponente, die eine Gruppe von Refs aktualisiert?
    // Oder einfach einen State mappen, der periodisch synct?
    // Da das CombatSystem extern ist, nutzen wir ein Ref-Updater-Pattern.

    // Projektile per ID identifizieren, um Meshes nicht neu zu erstellen
    // Wir rendern einen festen Pool oder mappen einfach.
    // Da wir React nicht leicht zwingen können, neue Kinder ohne State zu rendern,
    // nutzen wir ein kleines "forceUpdate" oder State-Sync bei 60fps?
    // State-Sync 60fps ist schlecht für React.

    // Besser: CombatSystem sollte einen Store nutzen?
    // ODER: Wir interpretieren "CombatSystem" als die Logik, und wir haben eine Visual Komponente,
    // die nur rendert, was da ist.

    // Einfache Lösung:
    // Lese CombatSystem-Projektile jeden Frame und aktualisiere Positionen bekannter Meshes.
    // Wenn die Liste sich in der Länge ändert, State setzen.

    const [projectiles, setProjectiles] = React.useState<Projectile[]>([]);

    useFrame(() => {
        const active = CombatSystem.getProjectiles();
        // Optimierung: React State nur aktualisieren, wenn Anzahl oder IDs sich ändern
        if (active.length !== projectiles.length ||
            (active.length > 0 && active[0].id !== projectiles[0].id)) {
            setProjectiles([...active]);
        }
    });

    return (
        <group>
            {projectiles.map(p => (
                <MolotovMesh key={p.id} projectile={p} />
            ))}
        </group>
    );
};

const MolotovMesh: React.FC<{ projectile: Projectile }> = ({ projectile }) => {
    const ref = useRef<THREE.Group>(null);

    useFrame(() => {
        if (ref.current) {
            ref.current.position.set(
                projectile.position[0],
                projectile.position[1],
                projectile.position[2]
            );
            // Rotate visually
            ref.current.rotation.x += 0.1;
            ref.current.rotation.z += 0.1;
        }
    });

    return (
        <group ref={ref}>
            {/* Bottle */}
            <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.8} />
            </mesh>
            {/* Rag/Fire */}
            <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.08]} />
                <meshStandardMaterial color="orange" emissive="red" emissiveIntensity={0.5} />
            </mesh>
            <pointLight distance={3} intensity={0.5} color="orange" />
        </group>
    );
};

export default CombatRenderer;
