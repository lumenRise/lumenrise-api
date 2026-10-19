import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import log from '../../src/logger';
import LaunchHolderRefreshJob from '../../src/models/LaunchHolderRefreshJob';
import publishLaunchHolderJob from '../../src/services/launch/publishLaunchHolderJob';
import enqueueLaunchHolderRefresh from '../../src/services/launch/enqueueLaunchHolderRefresh';

vi.mock('../../src/logger', () => ({ default: { warn: vi.fn() } }));
vi.mock('../../src/models/LaunchHolderRefreshJob', () => ({
  default: { findOneAndUpdate: vi.fn() },
}));
vi.mock('../../src/services/launch/publishLaunchHolderJob', () => ({ default: vi.fn() }));

const identity = { network: 'testnet' as const, contractId: 'launch' };
const job = { _id: new Types.ObjectId() };

describe('API holder refresh dispatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(LaunchHolderRefreshJob.findOneAndUpdate).mockResolvedValue(job as never);
  });

  it('persists the wallet job before publishing a broker wakeup', async () => {
    await enqueueLaunchHolderRefresh(identity, 'token', 'wallet');
    expect(LaunchHolderRefreshJob.findOneAndUpdate).toHaveBeenCalledWith(
      { ...identity, address: 'wallet' },
      {
        $set: expect.objectContaining({
          asset: 'token',
          requestId: expect.any(String),
          status: 'queued',
          attempts: 0,
        }),
      },
      { upsert: true, runValidators: true, returnDocument: 'after' },
    );
    expect(publishLaunchHolderJob).toHaveBeenCalledWith(job._id.toString(), 'testnet');
    expect(
      vi.mocked(LaunchHolderRefreshJob.findOneAndUpdate).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(publishLaunchHolderJob).mock.invocationCallOrder[0]!);
  });

  it('coalesces repeated requests into one wallet job while keeping a new request pending', async () => {
    await enqueueLaunchHolderRefresh(identity, 'token', 'wallet');
    await enqueueLaunchHolderRefresh(identity, 'token', 'wallet');
    const calls = vi.mocked(LaunchHolderRefreshJob.findOneAndUpdate).mock.calls;
    expect(calls[0]![0]).toEqual(calls[1]![0]);
    expect(calls[0]![1]).not.toEqual(calls[1]![1]);
    expect(publishLaunchHolderJob).toHaveBeenCalledTimes(2);
  });

  it('keeps the job for launch reconciliation when RabbitMQ is unavailable', async () => {
    vi.mocked(publishLaunchHolderJob).mockRejectedValue(new Error('broker unavailable'));
    await expect(enqueueLaunchHolderRefresh(identity, 'token', 'wallet')).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it('does not publish a job when persistence fails', async () => {
    vi.mocked(LaunchHolderRefreshJob.findOneAndUpdate).mockRejectedValue(new Error('storage down'));
    await expect(enqueueLaunchHolderRefresh(identity, 'token', 'wallet')).rejects.toThrow(
      'storage down',
    );
    expect(publishLaunchHolderJob).not.toHaveBeenCalled();
  });

  it('replaces a concurrent first insert instead of creating a second wallet job', async () => {
    vi.mocked(LaunchHolderRefreshJob.findOneAndUpdate).mockRejectedValueOnce({ code: 11000 });
    await enqueueLaunchHolderRefresh(identity, 'token', 'wallet');
    expect(LaunchHolderRefreshJob.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(publishLaunchHolderJob).toHaveBeenCalledOnce();
  });
});
