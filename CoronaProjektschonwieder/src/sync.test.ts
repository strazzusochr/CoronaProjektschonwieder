import { describe, expect, it } from 'vitest';
import { resolveSyncCursor, type SyncCursor } from './sync';

const baseCursor: SyncCursor = {
  revision: 7,
  updatedAt: '2026-04-17T10:00:00.000Z',
  sourceWindow: 'commander',
  sourceInstanceId: 'inst-a',
};

describe('resolveSyncCursor', () => {
  it('accepts higher revisions', () => {
    const result = resolveSyncCursor(
      baseCursor,
      { revision: 8, updatedAt: '2026-04-17T10:00:01.000Z', sourceWindow: 'glasshouse', sourceInstanceId: 'inst-b' },
      'inst-local',
    );
    expect(result.accept).toBe(true);
    expect(result.cursor.revision).toBe(8);
  });

  it('rejects lower revisions', () => {
    const result = resolveSyncCursor(
      baseCursor,
      { revision: 6, updatedAt: '2026-04-17T11:00:00.000Z', sourceWindow: 'operations', sourceInstanceId: 'inst-z' },
      'inst-local',
    );
    expect(result.accept).toBe(false);
    expect(result.cursor).toEqual(baseCursor);
  });

  it('rejects events from the same source instance', () => {
    const result = resolveSyncCursor(
      baseCursor,
      { revision: 8, updatedAt: '2026-04-17T11:00:00.000Z', sourceWindow: 'operations', sourceInstanceId: 'inst-local' },
      'inst-local',
    );
    expect(result.accept).toBe(false);
  });

  it('uses newer timestamp for equal revisions', () => {
    const result = resolveSyncCursor(
      baseCursor,
      { revision: 7, updatedAt: '2026-04-17T10:00:02.000Z', sourceWindow: 'commander', sourceInstanceId: 'inst-b' },
      'inst-local',
    );
    expect(result.accept).toBe(true);
    expect(result.cursor.sourceInstanceId).toBe('inst-b');
  });

  it('uses window priority when revision and timestamp tie', () => {
    const result = resolveSyncCursor(
      baseCursor,
      { revision: 7, updatedAt: '2026-04-17T10:00:00.000Z', sourceWindow: 'operations', sourceInstanceId: 'inst-b' },
      'inst-local',
    );
    expect(result.accept).toBe(true);
    expect(result.cursor.sourceWindow).toBe('operations');
  });

  it('uses instance id tie-breaker when all else ties', () => {
    const current: SyncCursor = {
      revision: 9,
      updatedAt: '2026-04-17T10:00:00.000Z',
      sourceWindow: 'operations',
      sourceInstanceId: 'inst-a',
    };
    const result = resolveSyncCursor(
      current,
      { revision: 9, updatedAt: '2026-04-17T10:00:00.000Z', sourceWindow: 'operations', sourceInstanceId: 'inst-z' },
      'inst-local',
    );
    expect(result.accept).toBe(true);
    expect(result.cursor.sourceInstanceId).toBe('inst-z');
  });

  it('accepts legacy payloads without revision but keeps current cursor', () => {
    const result = resolveSyncCursor(baseCursor, { sourceWindow: 'commander' }, 'inst-local');
    expect(result.accept).toBe(true);
    expect(result.cursor).toEqual(baseCursor);
  });
});
