import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, expect, it, vi } from 'vitest';

import app from '../src/app';
import requestDomainRead from '../src/services/messaging/requestDomainRead';

vi.mock('../src/services/messaging/requestDomainRead', () => ({ default: vi.fn() }));

vi.mock('../src/middleware/requireSession', () => ({
  default: (req: object, _res: unknown, next: () => void): void => {
    Object.assign(req, { auth: { identityId: new Types.ObjectId() } });

    next();
  },
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

beforeEach((): void => {
  vi.resetAllMocks();
});

it('rejects malformed requests before contacting the worker', async (): Promise<void> => {
  const response = await request(app).get(
    `/v1/stellar/accounts/${address}/soroban-evidence?cursor=wrong`,
  );

  expect(response.status).toBe(400);

  expect(requestDomainRead).not.toHaveBeenCalled();
});

it('preserves worker evidence payloads and binds requests to the authenticated identity', async (): Promise<void> => {
  const result = {
    ownershipVerified: false,
    scanId: new Types.ObjectId().toString(),
    coverage: { discoveredTransactions: 1, rpcNotFound: 1, rpcSuccess: 0 },
    items: [{ rpcStatus: 'not_found', initiatedOperation: false, envelope: null, events: [] }],
  };

  vi.mocked(requestDomainRead).mockResolvedValue(result);

  const response = await request(app).get(`/v1/stellar/accounts/${address}/soroban-evidence`);

  expect(response.status).toBe(200);

  expect(response.body.result).toEqual(result);

  expect(requestDomainRead).toHaveBeenCalledWith(
    'reputation',
    'soroban.evidence',
    expect.objectContaining({
      identity: expect.stringMatching(/^[a-f0-9]{24}$/),
      address,
      network: 'testnet',
      limit: expect.any(Number),
    }),
  );
});

it('preserves not-found and unavailable HTTP responses', async (): Promise<void> => {
  vi.mocked(requestDomainRead)
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error('Worker unavailable'));

  expect((await request(app).get(`/v1/stellar/accounts/${address}/soroban-evidence`)).status).toBe(
    404,
  );

  expect((await request(app).get(`/v1/stellar/accounts/${address}/soroban-evidence`)).status).toBe(
    503,
  );
});
