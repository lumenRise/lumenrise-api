import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueStellarActivityScan } from '../../src/utils/services/stellar/activityScanQueue/enqueueStellarActivityScan';
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../src/models/StellarActivityScan', () => ({
  default: { findOne: mocks.findOne, create: mocks.create },
}));
vi.mock('../../src/services/integration/publishReputationJob', () => ({
  publishReputationJob: mocks.publish,
}));
vi.mock('../../src/env', () => ({
  default: { STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org' },
}));
vi.mock('../../src/logger', () => ({ default: { warn: mocks.warn } }));

describe('Stellar scan dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes a wakeup after recording a scan', async () => {
    const identity = new Types.ObjectId();
    const scan = { _id: new Types.ObjectId(), address: 'G'.repeat(56), status: 'queued' };
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(scan);

    await expect(enqueueStellarActivityScan(identity, scan.address)).resolves.toEqual({
      scan,
      conflict: false,
    });
    expect(mocks.publish).toHaveBeenCalledWith(
      'lumenrise.reputation.stellar-scan.v1',
      scan._id.toString(),
    );
  });

  it('keeps the MongoDB scan if RabbitMQ is unavailable', async () => {
    const scan = { _id: new Types.ObjectId(), address: 'G'.repeat(56), status: 'queued' };
    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(scan);
    mocks.publish.mockRejectedValue(new Error('broker unavailable'));

    await expect(enqueueStellarActivityScan(new Types.ObjectId(), scan.address)).resolves.toEqual({
      scan,
      conflict: false,
    });
    expect(mocks.warn).toHaveBeenCalledOnce();
  });
});
