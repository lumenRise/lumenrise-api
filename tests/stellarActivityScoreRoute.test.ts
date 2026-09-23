import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import StellarActivityScan from '../src/models/StellarActivityScan.js';

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId: new Types.ObjectId() } });
    next();
  },
}));
vi.mock('../src/models/StellarActivityScan.js', () => ({
  default: { findOne: vi.fn() },
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Stellar activity score route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid addresses before querying the database', async () => {
    const response = await request(app).get('/v1/stellar/accounts/invalid/activity-score');

    expect(response.status).toBe(400);
    expect(StellarActivityScan.findOne).not.toHaveBeenCalled();
  });

  it('does not score an incomplete scan', async () => {
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue({ status: 'running' }),
    } as never);

    const response = await request(app).get(`/v1/stellar/accounts/${address}/activity-score`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Stellar activity scan is not completed');
  });

  it('returns an unverified address score only for the requested identity and Horizon', async () => {
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        address,
        status: 'completed',
        completedAt: new Date('2026-09-24T12:00:00Z'),
        pagesProcessed: 1,
        summary: {
          activeDayCount: 1,
          distinctTransactionCount: 1,
          initiatedOperationCount: 1,
          operationTypeCounts: { payment: 1 },
        },
      }),
    } as never);

    const response = await request(app).get(`/v1/stellar/accounts/${address}/activity-score`);

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      address,
      ownershipVerified: false,
      eligibilityProof: false,
      availableHistoryScanned: true,
    });
    expect(StellarActivityScan.findOne).toHaveBeenCalledWith({
      identity: expect.any(Types.ObjectId),
      address,
      sourceUrl: expect.any(String),
    });
  });
});
