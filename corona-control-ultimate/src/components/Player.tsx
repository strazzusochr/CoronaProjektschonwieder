import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import { PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import AudioManager from '@/managers/AudioManager';
import MeleeSystem from '@/components/combat/MeleeSystem';

const Player: React.FC = () => {
    // Referenzen (Refs)
    const cameraRef = useRef<ThreePerspectiveCamera>(null);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const inputStateRef = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        sprint: false
    });

    // Spiel-Speicher (Game Store)
    const addProjectile = useGameStore(state => state.addProjectile);

    // Interner Status für Kamera-Rotation
    const rotationRef = useRef({ yaw: 0, pitch: 0 });

    // Lokale Ref für Shoot-Request
    const shootRequest = useRef(false);

    // Tastatur-Eingabe-System
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup': inputStateRef.current.forward = true; break;
                case 's': case 'arrowdown': inputStateRef.current.backward = true; break;
                case 'a': case 'arrowleft': inputStateRef.current.left = true; break;
                case 'd': case 'arrowright': inputStateRef.current.right = true; break;
                case ' ': inputStateRef.current.jump = true; break;
                case 'shift': inputStateRef.current.sprint = true; break;
                case 'b': useGameStore.getState().toggleBinoculars(); break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup': inputStateRef.current.forward = false; break;
                case 's': case 'arrowdown': inputStateRef.current.backward = false; break;
                case 'a': case 'arrowleft': inputStateRef.current.left = false; break;
                case 'd': case 'arrowright': inputStateRef.current.right = false; break;
                case ' ': inputStateRef.current.jump = false; break;
                case 'shift': inputStateRef.current.sprint = false; break;
            }
        };

        // Schießen (Mausklick)
        const handleMouseDown = (e: MouseEvent) => {
            if (document.pointerLockElement && e.button === 0) {
                shootRequest.current = true;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    // Maus-Blick-System (Pointer Lock)
    useEffect(() => {
        const handleClick = () => {
            document.body.requestPointerLock();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement) {
                const sensitivity = 0.002;
                rotationRef.current.yaw -= e.movementX * sensitivity;
                rotationRef.current.pitch -= e.movementY * sensitivity;

                // Pitch begrenzen (nicht über Kopf drehen)
                rotationRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.pitch));
            }
        };

        document.body.addEventListener('click', handleClick);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.body.removeEventListener('click', handleClick);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Refs für Glättung und Audio
    const velocityRef = useRef(new THREE.Vector3());
    const bobTimer = useRef(0);
    const lastStepTime = useRef(0);

    // Frame Loop (Wird jeden Frame ausgeführt)
    useFrame((state, delta) => {
        // useGameStore.getState() used mostly for reads, kept minimal for perf

        // --- Schießen / Markieren ---
        if (shootRequest.current && rigidBodyRef.current) {
            const isUsingBinoculars = useGameStore.getState().player.isUsingBinoculars;

            if (isUsingBinoculars) {
                // Raycast Logik für Markierung
                const raycaster = new THREE.Raycaster();
                const center = new THREE.Vector2(0, 0); // Bildschirmmitte
                raycaster.setFromCamera(center, state.camera);

                // Wir suchen NPCs
                const intersects = raycaster.intersectObjects(state.scene.children, true);
                const hitNPC = intersects.find(intersect => {
                    let parent = intersect.object.parent;
                    while (parent) {
                        if (parent.userData?.type === 'npc') return true;
                        parent = parent.parent;
                    }
                    return false;
                });

                if (hitNPC) {
                    const userData = (hitNPC.object.parent as any)?.userData;
                    if (userData?.faction === 'KRAUSE') {
                        useGameStore.getState().setPrompt("ZIEL IDENTIFIZIERT: Martin Krause enttarnt!");
                        useGameStore.getState().markNpc(userData.id);
                        useGameStore.getState().updateMissionProgress(1); // Mission 2 Fortschritt
                        setTimeout(() => useGameStore.getState().setPrompt(null), 5000);
                    } else {
                        useGameStore.getState().setPrompt("NEGATIV: Keine Zielperson.");
                        setTimeout(() => useGameStore.getState().setPrompt(null), 2000);
                    }
                }
            } else {
                // Normaler Projektilwurf
                const pos = rigidBodyRef.current.translation();
                const direction = new THREE.Vector3();
                state.camera.getWorldDirection(direction);

                const spawnPos: [number, number, number] = [
                    pos.x + direction.x * 1.0,
                    pos.y + 0.5,
                    pos.z + direction.z * 1.0
                ];

                const force = 15;
                const velocity: [number, number, number] = [
                    direction.x * force,
                    direction.y * force + 5,
                    direction.z * force
                ];

                // Inventory Check (Simple: Hardcoded Slot 1 for Molotov)
                const inventory = useGameStore.getState().inventory;
                const molotovSlot = inventory[1];

                if (molotovSlot && molotovSlot.item && molotovSlot.item.id === 'molotov' && molotovSlot.item.quantity > 0) {
                    addProjectile(spawnPos, velocity, 'MOLOTOV');
                    useGameStore.getState().removeItem(1, 1);
                    useGameStore.getState().setPrompt("Molotow geworfen!");
                    setTimeout(() => useGameStore.getState().setPrompt(null), 1000);
                } else {
                    // Fallback: Infinite Stones? Or Empty click?
                    // Let's allow infinite stones if no molotovs, or just deny.
                    // Deny for now to emphasize Molotov.
                    useGameStore.getState().setPrompt("KEINE MUNITION!");
                    setTimeout(() => useGameStore.getState().setPrompt(null), 1000);
                }
            }
            shootRequest.current = false;
        }

        // --- Bewegungs-Berechnung ---
        let moveX = 0;
        let moveZ = 0;

        if (inputStateRef.current.forward) moveZ -= 1;
        if (inputStateRef.current.backward) moveZ += 1;
        if (inputStateRef.current.left) moveX -= 1;
        if (inputStateRef.current.right) moveX += 1;

        // Normalisierung
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 1) {
            moveX /= length;
            moveZ /= length;
        }

        // --- Stamina & Sprint Logic ---
        let isSprinting = inputStateRef.current.sprint;
        const currentStamina = useGameStore.getState().player.stamina;

        if (isSprinting && (length > 0) && currentStamina > 0) {
            // Sprint active
        } else {
            isSprinting = false;
        }

        const targetSpeed = isSprinting ? 4.0 : 2.0;

        // --- Head Bob Parameters ---
        const bobFreq = isSprinting ? 15 : 10;
        const bobAmp = isSprinting ? 0.1 : 0.05;

        // --- Physik & Geschwindigkeits-Anwendung ---
        if (rigidBodyRef.current) {
            const currentLinVel = rigidBodyRef.current.linvel();

            const yaw = rotationRef.current.yaw;
            const worldMoveX = moveX * Math.cos(yaw) - moveZ * Math.sin(yaw);
            const worldMoveZ = moveX * Math.sin(yaw) + moveZ * Math.cos(yaw);

            // Smooth Acceleration (Lerp)
            const accelFactor = 10.0 * delta;

            const targetVelX = worldMoveX * targetSpeed;
            const targetVelZ = worldMoveZ * targetSpeed;

            velocityRef.current.x = THREE.MathUtils.lerp(currentLinVel.x, targetVelX, accelFactor);
            velocityRef.current.z = THREE.MathUtils.lerp(currentLinVel.z, targetVelZ, accelFactor);

            // Sprung-Logik
            let finalVelY = currentLinVel.y;
            if (inputStateRef.current.jump && Math.abs(currentLinVel.y) < 0.1) {
                finalVelY = 5.0;
                inputStateRef.current.jump = false;
            }

            rigidBodyRef.current.setLinvel({ x: velocityRef.current.x, y: finalVelY, z: velocityRef.current.z }, true);

            // --- Head Bobbing & Audio ---
            if (length > 0) {
                bobTimer.current += delta * bobFreq;

                if (Math.sin(bobTimer.current) < -0.9 && (state.clock.elapsedTime - lastStepTime.current > 0.3)) {
                    lastStepTime.current = state.clock.elapsedTime;
                    AudioManager.getInstance().playFootstep();
                }
            } else {
                // Decay bob
                bobTimer.current = THREE.MathUtils.lerp(bobTimer.current, Math.round(bobTimer.current / Math.PI) * Math.PI, delta * 5);
            }
        }

        // --- Kamera Rotation & Position ---
        if (cameraRef.current && rigidBodyRef.current) {
            const playerPos = rigidBodyRef.current.translation();

            // Head Bob Offset applied here using bobAmp
            const bobY = Math.sin(bobTimer.current) * bobAmp * (length > 0 ? 1 : 0);

            cameraRef.current.position.set(playerPos.x, playerPos.y + 1.7 + bobY, playerPos.z);

            cameraRef.current.rotation.set(rotationRef.current.pitch, rotationRef.current.yaw, 0, 'YXZ');

            // FOV Anpassung für Fernglas
            const isUsingBinoculars = useGameStore.getState().player.isUsingBinoculars;
            const targetFOV = isUsingBinoculars ? 20 : 75;
            cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFOV, 10 * delta);

            cameraRef.current.updateProjectionMatrix();
            cameraRef.current.updateMatrixWorld(true);
        }
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            colliders={false}
            type="dynamic"
            position={[0, 1, 0]}
            enabledRotations={[false, false, false]} // Umfallen verhindern
        >
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} /> {/* Höhe (Halbhöhe), Radius */}

            <MeleeSystem />

            {/* Kamera innerhalb der Spieler-Logik-Gruppe, aber physikalisch getrennt/manuell gesteuert */}
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                fov={75}
                near={0.1}
                far={1000}
            />
        </RigidBody>
    );
};

export default Player;
