import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import ExternalAccount from '../src/models/ExternalAccount';
import reserveManualRefresh from '../src/services/refresh/reserveManualRefresh';
import releaseManualRefresh from '../src/services/refresh/releaseManualRefresh';
import { enqueueStellarActivityScan } from '../src/services/stellar/activityScanQueue';
import { enqueueGitHubSync, enqueueXSync } from '../src/services/integration/syncQueue';
import getXScoreUpdateAvailability from '../src/services/integration/getXScoreUpdateAvailability';

const identityId = new Types.ObjectId();
const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

vi.mock('../src/middleware/requireSession', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId } });
    next();
  },
}));
vi.mock('../src/services/integration/getXScoreUpdateAvailability', () => ({ default: vi.fn() }));
vi.mock('../src/models/ExternalAccount', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/services/refresh/reserveManualRefresh', () => ({ default: vi.fn() }));
vi.mock('../src/services/refresh/releaseManualRefresh', () => ({ default: vi.fn() }));
vi.mock('../src/services/integration/syncQueue', () => ({
  enqueueGitHubSync: vi.fn(),
  enqueueXSync: vi.fn(),
}));
vi.mock('../src/services/stellar/activityScanQueue', () => ({
  enqueueStellarActivityScan: vi.fn(),
  toStellarActivityScanResult: vi.fn(),
}));

describe('manual refresh routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getXScoreUpdateAvailability).mockResolvedValue({
      canUpdateScore: true,
      nextScoreUpdateAt: null,
    });
    vi.mocked(ExternalAccount.findOne).mockResolvedValue({ identity: identityId } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: false,
      retryAt: new Date(Date.now() + 900_000),
      reservedUntil: null,
    });
  });

  it.each(['github', 'x'])('limits repeat %s synchronization requests', async (provider) => {
    const response = await request(app).post(`/v1/connections/${provider}/sync`);

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(reserveManualRefresh).toHaveBeenCalledWith(identityId, `${provider}-sync`);
  });

  it('limits repeat Stellar activity scans', async () => {
    const response = await request(app).post(`/v1/stellar/accounts/${address}/activity-scan`);

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(reserveManualRefresh).toHaveBeenCalledWith(identityId, 'stellar-activity-scan:testnet');
  });

  it('releases the provider cooldown when queuing fails', async () => {
    const reservedUntil = new Date(Date.now() + 900_000);

    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: true,
      retryAt: null,
      reservedUntil,
    });
    vi.mocked(enqueueGitHubSync).mockRejectedValue(new Error('Queue unavailable'));

    const response = await request(app).post('/v1/connections/github/sync');

    expect(response.status).toBe(500);
    expect(releaseManualRefresh).toHaveBeenCalledWith(identityId, 'github-sync', reservedUntil);
  });

  it('releases the scan cooldown when another address is active', async () => {
    const reservedUntil = new Date(Date.now() + 900_000);

    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: true,
      retryAt: null,
      reservedUntil,
    });
    vi.mocked(enqueueStellarActivityScan).mockResolvedValue({ conflict: true } as never);

    const response = await request(app).post(`/v1/stellar/accounts/${address}/activity-scan`);

    expect(response.status).toBe(409);
    expect(releaseManualRefresh).toHaveBeenCalledWith(
      identityId,
      'stellar-activity-scan:testnet',
      reservedUntil,
    );
  });
  it('rejects X updates during the 30-day window before reserving another request', async () => {
    vi.mocked(getXScoreUpdateAvailability).mockResolvedValue({
      canUpdateScore: false,
      nextScoreUpdateAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    const response = await request(app).post('/v1/connections/x/sync');
    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(29 * 86400);
    expect(reserveManualRefresh).not.toHaveBeenCalled();
  });
  it('queues the first X calculation only when the user requests it', async () => {
    const now = new Date();
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: true,
      retryAt: null,
      reservedUntil: new Date(now.getTime() + 30 * 86400000),
    });
    const jobId = new Types.ObjectId();
    vi.mocked(enqueueXSync).mockResolvedValue({
      _id: jobId,
      provider: 'x',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: now,
      startedAt: null,
      completedAt: null,
      lastError: null,
      resultSnapshot: null,
    } as never);
    const response = await request(app).post('/v1/connections/x/sync');
    expect(response.status).toBe(202);
    expect(response.body.result.id).toBe(jobId.toString());
    expect(response.headers.location).toBe(`/v1/connections/x/sync/${jobId}`);
    expect(enqueueXSync).toHaveBeenCalledOnce();
    expect(reserveManualRefresh).toHaveBeenCalledWith(identityId, 'x-sync');
  });
});
