import { describe, expect, it } from 'vitest';

import {
  calculateGitHubSyncSchedule,
  calculateGitLabSyncSchedule,
  calculateSyncRetryDelay,
} from '../../src/services/integration/syncQueue.js';

describe('integration synchronization queue', () => {
  it('schedules a fresh account immediately', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');

    expect(calculateGitHubSyncSchedule(null, now)).toEqual(now);
  });

  it('schedules recently synchronized accounts after the minimum interval', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const lastSyncedAt = new Date('2026-09-22T11:55:00.000Z');

    expect(calculateGitHubSyncSchedule(lastSyncedAt, now)).toEqual(
      new Date('2026-09-22T12:10:00.000Z'),
    );
  });

  it('schedules recently synchronized GitLab accounts after the minimum interval', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const lastSyncedAt = new Date('2026-09-22T11:55:00.000Z');

    expect(calculateGitLabSyncSchedule(lastSyncedAt, now)).toEqual(
      new Date('2026-09-22T12:10:00.000Z'),
    );
  });

  it('backs retries off without exceeding one hour', () => {
    expect(calculateSyncRetryDelay(1)).toBe(60_000);
    expect(calculateSyncRetryDelay(3)).toBe(240_000);
    expect(calculateSyncRetryDelay(20)).toBe(3_600_000);
  });
});
