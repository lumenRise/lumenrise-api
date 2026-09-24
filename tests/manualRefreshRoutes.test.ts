import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import ExternalAccount from '../src/models/ExternalAccount.js';
import { enqueueGitHubSync } from '../src/services/integration/syncQueue.js';
import reserveManualRefresh from '../src/services/refresh/reserveManualRefresh.js';
import releaseManualRefresh from '../src/services/refresh/releaseManualRefresh.js';
import { enqueueStellarActivityScan } from '../src/services/stellar/activityScanQueue.js';

const identityId = new Types.ObjectId();
const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId } });
    next();
  },
}));
vi.mock('../src/models/ExternalAccount.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/services/refresh/reserveManualRefresh.js', () => ({ default: vi.fn() }));
vi.mock('../src/services/refresh/releaseManualRefresh.js', () => ({ default: vi.fn() }));
vi.mock('../src/services/integration/syncQueue.js', () => ({
  enqueueGitHubSync: vi.fn(),
}));
vi.mock('../src/services/stellar/activityScanQueue.js', () => ({
  enqueueStellarActivityScan: vi.fn(),
  toStellarActivityScanResult: vi.fn(),
}));

describe('manual refresh routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ExternalAccount.findOne).mockResolvedValue({ identity: identityId } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: false,
      retryAt: new Date(Date.now() + 900_000),
      reservedUntil: null,
    });
  });

  it.each(['github', 'gitlab', 'x'])(
    'limits repeat %s synchronization requests',
    async (provider) => {
      const response = await request(app).post(`/v1/connections/${provider}/sync`);

      expect(response.status).toBe(429);
      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
      expect(reserveManualRefresh).toHaveBeenCalledWith(identityId, `${provider}-sync`);
    },
  );

  it('limits repeat Stellar activity scans', async () => {
    const response = await request(app).post(`/v1/stellar/accounts/${address}/activity-scan`);

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(reserveManualRefresh).toHaveBeenCalledWith(identityId, 'stellar-activity-scan');
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
      'stellar-activity-scan',
      reservedUntil,
    );
  });
});
