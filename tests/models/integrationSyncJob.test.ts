import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import IntegrationSyncJob from '../../src/models/IntegrationSyncJob.js';

describe('IntegrationSyncJob model', () => {
  it('accepts a queued GitHub synchronization job', async () => {
    const job = new IntegrationSyncJob({
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      provider: 'github',
    });

    await expect(job.validate()).resolves.toBeUndefined();
    expect(job.status).toBe('queued');
    expect(job.active).toBe(true);
  });

  it('accepts a queued GitLab synchronization job', async () => {
    const job = new IntegrationSyncJob({
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      provider: 'gitlab',
    });

    await expect(job.validate()).resolves.toBeUndefined();
  });

  it('requires terminal jobs to be inactive and completed', async () => {
    const job = new IntegrationSyncJob({
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      provider: 'github',
      status: 'failed',
      active: true,
    });

    await expect(job.validate()).rejects.toThrow();
  });
});
