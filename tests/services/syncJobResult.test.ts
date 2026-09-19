import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import IntegrationSyncJob from '../../src/models/IntegrationSyncJob.js';
import createIntegrationSyncJobResult from '../../src/services/integration/syncJobResult.js';

describe('integration synchronization job result', () => {
  it('serializes a synchronization job for API responses', () => {
    const job = new IntegrationSyncJob({
      _id: new Types.ObjectId('66f17f34f312f37c76c62e11'),
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      provider: 'github',
      scheduledAt: new Date('2026-09-22T12:00:00.000Z'),
    });

    expect(createIntegrationSyncJobResult(job)).toMatchObject({
      id: '66f17f34f312f37c76c62e11',
      provider: 'github',
      status: 'queued',
      attempts: 0,
      scheduledAt: '2026-09-22T12:00:00.000Z',
      startedAt: null,
      completedAt: null,
      lastError: null,
      resultSnapshotId: null,
    });
  });
});
