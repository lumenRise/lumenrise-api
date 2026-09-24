import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import ExternalAccount from '../src/models/ExternalAccount.js';
import reserveManualRefresh from '../src/services/refresh/reserveManualRefresh.js';

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

describe('manual refresh routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ExternalAccount.findOne).mockResolvedValue({ identity: identityId } as never);
    vi.mocked(reserveManualRefresh).mockResolvedValue({
      allowed: false,
      retryAt: new Date(Date.now() + 900_000),
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
});
