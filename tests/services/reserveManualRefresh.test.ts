import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown.js';
import reserveManualRefresh from '../../src/services/refresh/reserveManualRefresh.js';

vi.mock('../../src/models/ManualRefreshCooldown.js', () => ({
  default: { findOneAndUpdate: vi.fn(), findOne: vi.fn() },
}));

describe('manual refresh reservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reserves a 15-minute window atomically per identity and target', async () => {
    const identity = new Types.ObjectId();
    const now = new Date('2026-09-25T12:00:00.000Z');
    const nextAllowedAt = new Date('2026-09-25T12:15:00.000Z');

    vi.mocked(ManualRefreshCooldown.findOneAndUpdate).mockResolvedValue({ nextAllowedAt } as never);

    await expect(reserveManualRefresh(identity, 'github-sync', now)).resolves.toEqual({
      allowed: true,
      retryAt: null,
    });
    expect(ManualRefreshCooldown.findOneAndUpdate).toHaveBeenCalledWith(
      {
        identity,
        target: 'github-sync',
        $or: [{ nextAllowedAt: { $lte: now } }, { nextAllowedAt: { $exists: false } }],
      },
      {
        $set: { nextAllowedAt },
        $setOnInsert: { identity, target: 'github-sync' },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
  });

  it('returns the existing retry time after a concurrent request wins', async () => {
    const identity = new Types.ObjectId();
    const now = new Date('2026-09-25T12:00:00.000Z');
    const retryAt = new Date('2026-09-25T12:12:00.000Z');

    vi.mocked(ManualRefreshCooldown.findOneAndUpdate).mockRejectedValue({ code: 11_000 });
    vi.mocked(ManualRefreshCooldown.findOne).mockResolvedValue({ nextAllowedAt: retryAt } as never);

    await expect(reserveManualRefresh(identity, 'github-sync', now)).resolves.toEqual({
      allowed: false,
      retryAt,
    });
  });
});
