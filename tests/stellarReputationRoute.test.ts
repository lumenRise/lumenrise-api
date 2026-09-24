import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import StellarAccount from '../src/models/StellarAccount.js';
import StellarActivityScan from '../src/models/StellarActivityScan.js';

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId: new Types.ObjectId() } });
    next();
  },
}));
vi.mock('../src/models/StellarAccount.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../src/models/StellarActivityScan.js', () => ({
  default: { findOne: vi.fn() },
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Stellar reputation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(StellarAccount.findOne).mockResolvedValue({ address } as never);
  });

  it('uses only the authenticated identity primary connected wallet', async () => {
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never);

    const response = await request(app).get('/v1/reputation/stellar');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      address,
      ownershipVerified: true,
      scanStatus: 'not_started',
      scan: null,
      score: null,
    });
    expect(StellarAccount.findOne).toHaveBeenCalledWith({
      identity: expect.any(Types.ObjectId),
      isPrimary: true,
      disconnectedAt: null,
    });
    expect(StellarActivityScan.findOne).toHaveBeenCalledWith({
      identity: expect.any(Types.ObjectId),
      address,
      sourceUrl: expect.any(String),
    });
  });

  it('returns scan evidence and a verified-wallet score only after completion', async () => {
    const scanId = new Types.ObjectId();

    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        _id: scanId,
        address,
        status: 'completed',
        cursor: null,
        pagesProcessed: 2,
        lastProcessedAt: new Date('2026-09-24T11:00:00Z'),
        completedAt: new Date('2026-09-24T12:00:00Z'),
        lastError: null,
        summary: {
          activeDayCount: 45,
          distinctTransactionCount: 150,
          initiatedOperationCount: 100,
          operationTypeCounts: { payment: 150, change_trust: 50 },
        },
      }),
    } as never);

    const response = await request(app).get('/v1/reputation/stellar');

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      address,
      ownershipVerified: true,
      scanStatus: 'completed',
      scan: { id: scanId.toString(), ownershipVerified: true, pagesProcessed: 2 },
      score: {
        scanId: scanId.toString(),
        ownershipVerified: true,
        eligibilityProof: false,
        algorithmVersion: 'stellar-activity-v1',
      },
    });
    expect(response.body.result.score.signals).toHaveLength(4);
  });

  it('does not publish a score from a running scan', async () => {
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        address,
        status: 'running',
        cursor: 'cursor',
        pagesProcessed: 1,
        lastProcessedAt: null,
        completedAt: null,
        lastError: null,
        summary: {},
      }),
    } as never);

    const response = await request(app).get('/v1/reputation/stellar');

    expect(response.status).toBe(200);
    expect(response.body.result.scanStatus).toBe('running');
    expect(response.body.result.score).toBeNull();
  });

  it('rejects an identity without a primary connected wallet', async () => {
    vi.mocked(StellarAccount.findOne).mockResolvedValue(null);

    const response = await request(app).get('/v1/reputation/stellar');

    expect(response.status).toBe(404);
    expect(StellarActivityScan.findOne).not.toHaveBeenCalled();
  });
});
