import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueXSync } from '../../src/utils/services/integration/syncQueue/enqueueXSync.js';
import { enqueueGitHubSync } from '../../src/utils/services/integration/syncQueue/enqueueGitHubSync.js';

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  publish: vi.fn(),
  publishReputationJob: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../src/utils/services/integration/syncQueue/enqueueIntegrationSync.js', () => ({
  enqueueIntegrationSync: mocks.enqueue,
}));
vi.mock('../../src/services/integration/publishGitHubSyncJob.js', () => ({
  publishGitHubSyncJob: mocks.publish,
}));
vi.mock('../../src/services/integration/publishReputationJob.js', () => ({
  publishReputationJob: mocks.publishReputationJob,
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

    await expect(
      enqueueGitHubSync({ provider: 'github', lastSyncedAt: null } as never),
    ).resolves.toBe(job);
    expect(mocks.warn).toHaveBeenCalledOnce();
  });

  it('publishes an X wakeup after persisting the job', async () => {
    const account = { _id: new Types.ObjectId(), provider: 'x', lastSyncedAt: null };
    const job = { _id: new Types.ObjectId() };
    mocks.enqueue.mockResolvedValue(job);
    mocks.publishReputationJob.mockResolvedValue(undefined);

    await expect(enqueueXSync(account as never)).resolves.toBe(job);
    expect(mocks.publishReputationJob).toHaveBeenCalledWith(
      'lumenrise.reputation.x-sync.v1',
      job._id.toString(),
    );
  });
});
