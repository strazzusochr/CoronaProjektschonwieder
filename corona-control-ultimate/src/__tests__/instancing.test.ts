import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

describe('Instancing Logic', () => {
    it('correctly sets instance matrices', () => {
        const count = 5;
        const mesh = new THREE.InstancedMesh(
            new THREE.BoxGeometry(),
            new THREE.MeshStandardMaterial(),
            count
        );
        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            dummy.position.set(i, 0, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(0, matrix);
        expect(matrix.elements[12]).toBe(0); // x-position

        mesh.getMatrixAt(4, matrix);
        expect(matrix.elements[12]).toBe(4); // x-position
    });
});
