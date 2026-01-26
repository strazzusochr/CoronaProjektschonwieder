import React, { useEffect, useState, useRef } from 'react';
import { RigidBody, CapsuleCollider, BallCollider } from '@react-three/rapier';
import CombatSystem from '@/systems/CombatSystem';
import type { Projectile } from '@/systems/CombatSystem';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const CombatRenderer: React.FC = () => {
    const [projectiles, setProjectiles] = useState<Projectile[]>([]);

    useEffect(() => {
        const updateProjectiles = () => {
            setProjectiles([...CombatSystem.getProjectiles()]);
        };

        // Initial load
        updateProjectiles();

        // Subscribe to changes
        const unsubscribe = CombatSystem.subscribe(updateProjectiles);
        return () => unsubscribe();
    }, []);

    return (
        <group>
            {projectiles.map(p => (
                <ProjectileBody key={p.id} projectile={p} />
            ))}
        </group>
    );
};

const ProjectileBody: React.FC<{ projectile: Projectile }> = ({ projectile }) => {
    const rigidBodyRef = useRef<any>(null);
    const isMolotov = projectile.type === 'MOLOTOV';

    // Handle collision
    const handleCollision = (e: any) => {
        // We only care about the first impact usually, or we let the system decide.
        // Rapier might fire multiple times.
        // We report the impact position.
        if (rigidBodyRef.current) {
            const pos = rigidBodyRef.current.translation();
            CombatSystem.handleImpact(projectile.id, [pos.x, pos.y, pos.z]);
        }
    };

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={projectile.position}
            linearVelocity={projectile.velocity}
            colliders="ball"
            name="projectile"
            userData={{
                id: projectile.id,
                type: projectile.type,
                damage: isMolotov ? 20 : 10, // Example values
                damageType: isMolotov ? 'FIRE' : 'PHYSICAL'
            }}
            onCollisionEnter={handleCollision}
        >
            <BallCollider args={[0.1]} />
            <group>
                {isMolotov ? (
                    <MolotovVisuals />
                ) : (
                    <StoneVisuals />
                )}
            </group>
        </RigidBody>
    );
};

const MolotovVisuals: React.FC = () => {
    const meshRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += 0.1;
            meshRef.current.rotation.z += 0.1;
        }
    });

    return (
        <group ref={meshRef}>
            {/* Bottle */}
            <mesh>
                <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.8} />
            </mesh>
            {/* Rag/Fire */}
            <mesh position={[0, 0.15, 0]}>
                <sphereGeometry args={[0.04]} />
                <meshStandardMaterial color="orange" emissive="red" emissiveIntensity={1} />
            </mesh>
            <pointLight distance={2} intensity={1} color="orange" />
        </group>
    );
};

const StoneVisuals: React.FC = () => (
    <mesh>
        <dodecahedronGeometry args={[0.08]} />
        <meshStandardMaterial color="gray" />
    </mesh>
);

export default CombatRenderer;
