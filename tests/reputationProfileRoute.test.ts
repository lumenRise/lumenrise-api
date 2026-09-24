import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import Identity from '../src/models/Identity.js';
import StellarAccount from '../src/models/StellarAccount.js';
import ExternalAccount from '../src/models/ExternalAccount.js';
import ReputationSnapshot from '../src/models/ReputationSnapshot.js';
import StellarActivityScan from '../src/models/StellarActivityScan.js';

const identityId = new Types.ObjectId();
const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const collectedAt = new Date('2026-09-24T10:00:00Z');

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId } });
    next();
  },
}));
vi.mock('../src/models/Identity.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../src/models/StellarAccount.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/ExternalAccount.js', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/ReputationSnapshot.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/StellarActivityScan.js', () => ({ default: { findOne: vi.fn() } }));

describe('reputation profile route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Identity.findById).mockResolvedValue({ _id: identityId, name: 'Mahdi' } as never);
    vi.mocked(StellarAccount.findOne).mockResolvedValue({ address } as never);
    vi.mocked(ExternalAccount.find).mockResolvedValue([] as never);
    vi.mocked(ReputationSnapshot.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never);
    vi.mocked(StellarActivityScan.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never);
  });

  it('returns the primary wallet and null for unavailable scores', async () => {
    const response = await request(app).get('/v1/reputation/profile');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      identity: { id: identityId.toString(), name: 'Mahdi', primaryWalletAddress: address },
      developer: null,
      social: null,
      stellar: {
        address,
        ownershipVerified: true,
        scanStatus: 'not_started',
        scan: null,
        score: null,
      },
    });
  });

  it('keeps each connected score with its own version and evidence', async () => {
    vi.mocked(ExternalAccount.find).mockResolvedValue([
      { provider: 'github' },
      { provider: 'x' },
    ] as never);
    vi.mocked(ReputationSnapshot.findOne).mockImplementation(
      (filter) =>
        ({
          sort: vi.fn().mockResolvedValue({
            category: filter.category,
            status: 'complete',
            algorithmVersion: `${filter.category}-v1`,
            score: filter.category === 'developer' ? 72 : 61,
            signals: [],
            sources: [
              {
                provider: filter.category === 'developer' ? 'github' : 'x',
                snapshot: new Types.ObjectId(),
                dataVersion: 'v1',
                collectedAt,
              },
            ],
            calculatedAt: collectedAt,
          }),
        }) as never,
    );

    const response = await request(app).get('/v1/reputation/profile');

    expect(response.status).toBe(200);
    expect(response.body.result.developer).toMatchObject({
      category: 'developer',
      algorithmVersion: 'developer-v1',
      score: 72,
      sources: [{ provider: 'github', collectedAt: collectedAt.toISOString() }],
    });
    expect(response.body.result.social).toMatchObject({
      category: 'social',
      algorithmVersion: 'social-v1',
      score: 61,
      sources: [{ provider: 'x', collectedAt: collectedAt.toISOString() }],
    });
    expect(response.body.result).not.toHaveProperty('score');
  });

  it('does not expose scores sourced from disconnected providers', async () => {
    vi.mocked(ExternalAccount.find).mockResolvedValue([{ provider: 'github' }] as never);
    vi.mocked(ReputationSnapshot.findOne).mockImplementation(
      (filter) =>
        ({
          sort: vi.fn().mockResolvedValue({
            category: filter.category,
            sources: [{ provider: filter.category === 'developer' ? 'gitlab' : 'x' }],
          }),
        }) as never,
    );

    const response = await request(app).get('/v1/reputation/profile');

    expect(response.status).toBe(200);
    expect(response.body.result.developer).toBeNull();
    expect(response.body.result.social).toBeNull();
  });

  it('returns 404 when the identity has disappeared', async () => {
    vi.mocked(Identity.findById).mockResolvedValue(null);

    const response = await request(app).get('/v1/reputation/profile');

    expect(response.status).toBe(404);
  });
});
