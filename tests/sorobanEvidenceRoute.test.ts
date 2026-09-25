import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import StellarActivityScan from '../src/models/StellarActivityScan.js';
import SorobanTransactionEvidence from '../src/models/SorobanTransactionEvidence.js';

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId: new Types.ObjectId() } });
    next();
  },
}));
vi.mock('../src/models/StellarActivityScan.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../src/models/SorobanTransactionEvidence.js', () => ({
  default: { find: vi.fn(), aggregate: vi.fn() },
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Soroban evidence route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid cursors before database access', async () => {
    const response = await request(app).get(
      `/v1/stellar/accounts/${address}/soroban-evidence?cursor=wrong`,
    );
    expect(response.status).toBe(400);
    expect(StellarActivityScan.findOne).not.toHaveBeenCalled();
  });

  it('limits results to the latest scan owned by the requester and shows RPC gaps', async () => {
    const scan = { _id: new Types.ObjectId(), status: 'completed' };
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(scan),
    } as never);
    vi.mocked(SorobanTransactionEvidence.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            transactionHash: 'a'.repeat(64),
            operationIds: ['1'],
            initiatedOperation: false,
            observedAt: new Date('2026-09-26T12:00:00Z'),
            rpcStatus: 'not_found',
            attempts: 3,
            ledger: null,
            envelopeXdr: null,
            returnValueXdr: null,
            events: [],
          },
        ]),
      }),
    } as never);
    vi.mocked(SorobanTransactionEvidence.aggregate).mockResolvedValue([
      { _id: 'not_found', count: 1 },
    ]);

    const response = await request(app).get(`/v1/stellar/accounts/${address}/soroban-evidence`);

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      ownershipVerified: false,
      scanId: scan._id.toString(),
      coverage: { discoveredTransactions: 1, rpcNotFound: 1, rpcSuccess: 0 },
      items: [{ rpcStatus: 'not_found', initiatedOperation: false, envelope: null, events: [] }],
    });
    expect(StellarActivityScan.findOne).toHaveBeenCalledWith({
      identity: expect.any(Types.ObjectId),
      address,
      sourceUrl: expect.any(String),
    });
    expect(SorobanTransactionEvidence.find).toHaveBeenCalledWith({ scan: scan._id });
  });
});
