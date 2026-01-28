import React, { createContext, useContext, useMemo } from 'react';

interface LODThresholds {
    high: number;
    medium: number;
    low: number;
}

const DEFAULT_THRESHOLDS: LODThresholds = {
    high: 15,    // LOD0 -> LOD1
    medium: 40,  // LOD1 -> LOD2
    low: 80      // LOD2 -> LOD3
};

const LODContext = createContext<LODThresholds>(DEFAULT_THRESHOLDS);

export const useLOD = () => useContext(LODContext);

export const LODProvider: React.FC<{ children: React.ReactNode, thresholds?: Partial<LODThresholds> }> = ({
    children,
    thresholds
}) => {
    const value = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...thresholds }), [thresholds]);
    return <LODContext.Provider value={value}>{children}</LODContext.Provider>;
};

/**
 * LODManager - Global performance coordinator for level-of-detail transitions.
 */
export default {
    useLOD,
    LODProvider
};
