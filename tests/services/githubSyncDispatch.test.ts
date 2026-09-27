import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueGitHubSync } from '../../src/utils/services/integration/syncQueue/enqueueGitHubSync.js';
import { claimIntegrationSyncJob } from '../../src/utils/services/integration/syncQueue/claimIntegrationSyncJob.js';

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  publish: vi.fn(),
  claim: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../src/utils/services/integration/syncQueue/enqueueIntegrationSync.js', () => ({
  enqueueIntegrationSync: mocks.enqueue,
}));
vi.mock('../../src/services/integration/publishGitHubSyncJob.js', () => ({
  publishGitHubSyncJob: mocks.publish,
}));
vi.mock('../../src/models/IntegrationSyncJob.js', () => ({
  default: { findOneAndUpdate: mocks.claim },
}));
vi.mock('../../src/logger.js', () => ({ default: { warn: mocks.warn } }));

describe('GitHub sync dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes a wakeup after persisting the job', async () => {
    const account = { _id: new Types.ObjectId(), provider: 'github', lastSyncedAt: null };
    const job = { _id: new Types.ObjectId() };
    const now = new Date('2026-09-29T12:00:00.000Z');
    mocks.enqueue.mockResolvedValue(job);
    mocks.publish.mockResolvedValue(undefined);

    await expect(enqueueGitHubSync(account as never, now)).resolves.toBe(job);
    expect(mocks.enqueue).toHaveBeenCalledWith(account, 'github', now, 'GitHub');
    expect(mocks.publish).toHaveBeenCalledWith(job._id.toString());
  });

  it('keeps the MongoDB job when RabbitMQ publish fails', async () => {
    const job = { _id: new Types.ObjectId() };
    mocks.enqueue.mockResolvedValue(job);
    mocks.publish.mockRejectedValue(new Error('broker unavailable'));

    await expect(enqueueGitHubSync({ provider: 'github', lastSyncedAt: null } as never))
      .resolves.toBe(job);
    expect(mocks.warn).toHaveBeenCalledOnce();
  });

  it('limits the API worker to X jobs', async () => {
    mocks.claim.mockResolvedValue(null);

    await claimIntegrationSyncJob();

    expect(mocks.claim.mock.calls[0]?.[0]).toMatchObject({
      provider: 'x',
      active: true,
    });
  });
});
