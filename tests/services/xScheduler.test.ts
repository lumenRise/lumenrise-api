import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueDueXSyncs } from '../../src/services/integration/xScheduler.js';

const mocks = vi.hoisted(() => ({
  findAccounts: vi.fn(),
  findJob: vi.fn(),
  enqueueSync: vi.fn(),
}));

vi.mock('../../src/env.js', () => ({
  default: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    X_AUTO_SYNC_INTERVAL_HOURS: 24,
  },
}));
vi.mock('../../src/models/ExternalAccount.js', () => ({
  default: { find: mocks.findAccounts },
}));
vi.mock('../../src/models/IntegrationSyncJob.js', () => ({
  default: { findOne: mocks.findJob },
}));
vi.mock('../../src/services/integration/syncQueue.js', () => ({
  enqueueXSync: mocks.enqueueSync,
}));

const account = { _id: new Types.ObjectId(), provider: 'x', status: 'connected' };
const now = new Date('2026-09-23T12:00:00.000Z');

describe('automatic X synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAccounts.mockReturnValue({
      cursor: async function* () {
        yield account;
      },
    });
    mocks.findJob.mockReturnValue({ sort: vi.fn().mockResolvedValue(null) });
    mocks.enqueueSync.mockResolvedValue({});
  });

  it('queues an overdue connected X account', async () => {
    const enqueued = await enqueueDueXSyncs(now);
    const accountFilter = mocks.findAccounts.mock.calls[0]?.[0];

    expect(enqueued).toBe(1);
    expect(accountFilter).toMatchObject({ provider: 'x', status: 'connected' });
    expect(accountFilter.$or[1].lastSyncedAt.$lte).toEqual(new Date('2026-09-22T12:00:00.000Z'));
    expect(mocks.enqueueSync).toHaveBeenCalledWith(account, now);
  });

  it('does not queue another job while a recent one is active', async () => {
    mocks.findJob.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ active: true, createdAt: now }),
    });

    expect(await enqueueDueXSyncs(now)).toBe(0);
    expect(mocks.enqueueSync).not.toHaveBeenCalled();
  });
});
