export type SyncCursor = {
  revision: number;
  updatedAt: string;
  sourceWindow: string;
  sourceInstanceId: string;
};

export type SyncEnvelope = {
  revision?: number;
  updatedAt?: string;
  sourceWindow?: string;
  sourceInstanceId?: string;
};

const WINDOW_PRIORITY: Record<string, number> = {
  commander: 1,
  glasshouse: 2,
  operations: 3,
};

function priorityForWindow(windowRole: string): number {
  return WINDOW_PRIORITY[windowRole] ?? 0;
}

function parseEpoch(value: string): number | null {
  if (!value) return null;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : null;
}

export function resolveSyncCursor(
  current: SyncCursor,
  incoming: SyncEnvelope,
  localInstanceId: string,
): { accept: boolean; cursor: SyncCursor } {
  const incomingRevision = Number(incoming.revision ?? 0);
  if (!Number.isFinite(incomingRevision) || incomingRevision <= 0) {
    return { accept: true, cursor: current };
  }

  const incomingCursor: SyncCursor = {
    revision: incomingRevision,
    updatedAt: String(incoming.updatedAt ?? ''),
    sourceWindow: String(incoming.sourceWindow ?? ''),
    sourceInstanceId: String(incoming.sourceInstanceId ?? ''),
  };

  if (incomingCursor.sourceInstanceId && incomingCursor.sourceInstanceId === localInstanceId) {
    return { accept: false, cursor: current };
  }

  if (incomingCursor.revision < current.revision) {
    return { accept: false, cursor: current };
  }

  if (incomingCursor.revision > current.revision) {
    return { accept: true, cursor: incomingCursor };
  }

  const incomingEpoch = parseEpoch(incomingCursor.updatedAt);
  const currentEpoch = parseEpoch(current.updatedAt);
  if (incomingEpoch !== null || currentEpoch !== null) {
    if (incomingEpoch !== null && (currentEpoch === null || incomingEpoch > currentEpoch)) {
      return { accept: true, cursor: incomingCursor };
    }
    if (currentEpoch !== null && (incomingEpoch === null || incomingEpoch < currentEpoch)) {
      return { accept: false, cursor: current };
    }
  }

  const incomingPriority = priorityForWindow(incomingCursor.sourceWindow);
  const currentPriority = priorityForWindow(current.sourceWindow);
  if (incomingPriority > currentPriority) {
    return { accept: true, cursor: incomingCursor };
  }
  if (incomingPriority < currentPriority) {
    return { accept: false, cursor: current };
  }

  const incomingInstance = incomingCursor.sourceInstanceId;
  const currentInstance = current.sourceInstanceId;
  if (incomingInstance && currentInstance && incomingInstance !== currentInstance) {
    if (incomingInstance > currentInstance) {
      return { accept: true, cursor: incomingCursor };
    }
    return { accept: false, cursor: current };
  }

  return { accept: false, cursor: current };
}
