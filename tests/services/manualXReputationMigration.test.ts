import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import XDataSnapshot from '../../src/models/XDataSnapshot';
import ExternalAccount from '../../src/models/ExternalAccount';
import ReputationSnapshot from '../../src/models/ReputationSnapshot';
import ManualRefreshCooldown from '../../src/models/ManualRefreshCooldown';
import manualXReputation from '../../src/migrations/20261013ManualXReputation';

vi.mock('../../src/models/XDataSnapshot', () => ({
  default: { collection: { updateMany: vi.fn() } },
}));
vi.mock('../../src/models/ReputationSnapshot', () => ({
  default: { collection: { updateMany: vi.fn() } },
}));
vi.mock('../../src/models/ExternalAccount', () => ({ default: { find: vi.fn() } }));
vi.mock('../../src/models/ManualRefreshCooldown', () => ({ default: { updateOne: vi.fn() } }));

describe('manual X reputation migration', () => {
  it('normalizes stored v2 statuses without recalculating scores and retains the longest cooldown', async () => {
    const identity = new Types.ObjectId();
    const account = { identity, lastSyncedAt: new Date('2026-10-13T00:00:00.000Z') };
    vi.mocked(ExternalAccount.find).mockReturnValue({ cursor: () => [account] } as never);
    await manualXReputation.up();
    expect(XDataSnapshot.collection.updateMany).toHaveBeenCalledWith(
      { dataVersion: 'x-data-v2' },
      expect.any(Array),
    );
    expect(ReputationSnapshot.collection.updateMany).toHaveBeenCalledWith(
      { category: 'social', algorithmVersion: 'social-v2', status: 'partial' },
      { $set: { status: 'complete' } },
    );
    expect(ManualRefreshCooldown.updateOne).toHaveBeenCalledWith(
      { identity, target: 'x-sync' },
      { $max: { nextAllowedAt: new Date('2026-11-12T00:00:00.000Z') } },
      { upsert: true, runValidators: true },
    );
  });
});
