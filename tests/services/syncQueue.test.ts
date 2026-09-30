import { describe, expect, it } from 'vitest';

import {
  calculateGitHubSyncSchedule,
  calculateXSyncSchedule,
} from '../../src/services/integration/syncQueue';

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

  it('schedules recently synchronized X accounts after the minimum interval', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const lastSyncedAt = new Date('2026-09-22T11:55:00.000Z');

    expect(calculateXSyncSchedule(lastSyncedAt, now)).toEqual(new Date('2026-09-22T12:10:00.000Z'));
  });
});
