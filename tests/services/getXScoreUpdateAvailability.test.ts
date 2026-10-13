import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown';
import getXScoreUpdateAvailability from '../../src/services/integration/getXScoreUpdateAvailability';

vi.mock('../../src/models/ManualRefreshCooldown', () => ({ default: { findOne: vi.fn() } }));

const identity = new Types.ObjectId();
const now = new Date('2026-10-13T00:00:00.000Z');

describe('X score update availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ManualRefreshCooldown.findOne).mockResolvedValue(null);
  });

  it('allows the first calculation immediately after connection', async () => {
    await expect(
      getXScoreUpdateAvailability({ identity, lastSyncedAt: null } as never, now),
    ).resolves.toEqual({ canUpdateScore: true, nextScoreUpdateAt: null });
  });

  it('enforces 30 days from an existing calculation even without a reservation', async () => {
    await expect(
      getXScoreUpdateAvailability({ identity, lastSyncedAt: now } as never, now),
    ).resolves.toEqual({ canUpdateScore: false, nextScoreUpdateAt: '2026-11-12T00:00:00.000Z' });
  });

  it('preserves the identity reservation after disconnection and reconnection', async () => {
    vi.mocked(ManualRefreshCooldown.findOne).mockResolvedValue({
      nextAllowedAt: new Date('2026-11-12T00:00:00.000Z'),
    } as never);
    await expect(
      getXScoreUpdateAvailability({ identity, lastSyncedAt: null } as never, now),
    ).resolves.toEqual({ canUpdateScore: false, nextScoreUpdateAt: '2026-11-12T00:00:00.000Z' });
    expect(ManualRefreshCooldown.findOne).toHaveBeenCalledWith({ identity, target: 'x-sync' });
  });

  it('allows updates exactly at the end of the rolling window', async () => {
    vi.mocked(ManualRefreshCooldown.findOne).mockResolvedValue({ nextAllowedAt: now } as never);
    await expect(
      getXScoreUpdateAvailability(
        { identity, lastSyncedAt: new Date('2026-09-13T00:00:00.000Z') } as never,
        now,
      ),
    ).resolves.toEqual({ canUpdateScore: true, nextScoreUpdateAt: null });
  });
});
