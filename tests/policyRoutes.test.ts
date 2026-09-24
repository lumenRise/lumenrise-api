import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import Policy from '../src/models/Policy.js';
import evaluatePolicy from '../src/services/policy/evaluatePolicy.js';
import getReputationProfile from '../src/services/reputation/profile.js';
import reserveManualRefresh from '../src/services/refresh/reserveManualRefresh.js';
import releaseManualRefresh from '../src/services/refresh/releaseManualRefresh.js';

const identityId = new Types.ObjectId();
const policyId = new Types.ObjectId();
const createdAt = new Date('2026-09-25T12:00:00.000Z');
const definition = {
  key: 'stellar-active',
  version: 1,
  match: 'all',
  rules: [{ dimension: 'stellar', minScore: 50, maxAgeSeconds: 86_400 }],
};
const policy = { _id: policyId, createdAt, ...definition };

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId } });
    next();
  },
}));
vi.mock('../src/models/Policy.js', () => ({
  default: { create: vi.fn(), find: vi.fn(), findOne: vi.fn() },
}));
vi.mock('../src/services/reputation/profile.js', () => ({ default: vi.fn() }));
vi.mock('../src/services/policy/evaluatePolicy.js', () => ({ default: vi.fn() }));
vi.mock('../src/services/refresh/reserveManualRefresh.js', () => ({ default: vi.fn() }));
vi.mock('../src/services/refresh/releaseManualRefresh.js', () => ({ default: vi.fn() }));

describe('policy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a version owned by the authenticated identity', async () => {
    vi.mocked(Policy.create).mockResolvedValue(policy as never);

    const response = await request(app)
      .post('/v1/policies')
      .send({
        ...definition,
        ownerIdentity: new Types.ObjectId().toString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.result).toMatchObject(definition);
    expect(Policy.create).toHaveBeenCalledWith({ ...definition, ownerIdentity: identityId });
  });

  it('limits repeat evaluations and returns Retry-After', async () => {
    vi.mocked(Policy.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(policy),
    } as never);
    vi.mocked(getReputationProfile).mockResolvedValue({ identity: {} } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: false,
      retryAt: new Date(Date.now() + 900_000),
      reservedUntil: null,
    });

    const response = await request(app).post('/v1/policies/stellar-active/evaluate');

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(getReputationProfile).toHaveBeenCalledWith(identityId);
  });

  it('reads only the latest version owned by the current identity', async () => {
    vi.mocked(Policy.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(policy),
    } as never);

    const response = await request(app).get('/v1/policies/stellar-active');

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject(definition);
    expect(Policy.findOne).toHaveBeenCalledWith({
      ownerIdentity: identityId,
      key: 'stellar-active',
    });
  });

  it('evaluates the latest owned policy using the stored profile', async () => {
    const evaluation = {
      policyKey: 'stellar-active',
      policyVersion: 1,
      decision: 'insufficient_data',
      evaluatedAt: createdAt.toISOString(),
      expiresAt: null,
      rules: [],
    };

    vi.mocked(Policy.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(policy),
    } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: true,
      retryAt: null,
      reservedUntil: new Date(Date.now() + 900_000),
    });
    vi.mocked(getReputationProfile).mockResolvedValue({ identity: {} } as never);
    vi.mocked(evaluatePolicy).mockReturnValue(evaluation as never);

    const response = await request(app).post('/v1/policies/stellar-active/evaluate');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual(evaluation);
    expect(Policy.findOne).toHaveBeenCalledWith({
      ownerIdentity: identityId,
      key: 'stellar-active',
    });
    expect(reserveManualRefresh).toHaveBeenCalledWith(
      identityId,
      'policy-evaluation:stellar-active',
    );
  });

  it('releases the evaluation cooldown when evaluation fails', async () => {
    const reservedUntil = new Date(Date.now() + 900_000);

    vi.mocked(Policy.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(policy),
    } as never);
    vi.mocked(getReputationProfile).mockResolvedValue({ identity: {} } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: true,
      retryAt: null,
      reservedUntil,
    });
    vi.mocked(evaluatePolicy).mockImplementation(() => {
      throw new Error('Evaluation failed');
    });

    const response = await request(app).post('/v1/policies/stellar-active/evaluate');

    expect(response.status).toBe(503);
    expect(releaseManualRefresh).toHaveBeenCalledWith(
      identityId,
      'policy-evaluation:stellar-active',
      reservedUntil,
    );
  });
});
