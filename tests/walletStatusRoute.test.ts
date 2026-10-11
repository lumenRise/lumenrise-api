import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import StellarAccount from '../src/models/StellarAccount';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('wallet registration status route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    '/v1/auth/wallet/status',
    '/v1/auth/wallet/status?address=invalid',
    `/v1/auth/wallet/status?address=${address}&address=${address}`,
    `/v1/auth/wallet/status?address[value]=${address}`,
  ])('rejects an invalid address without querying the database: %s', async (url) => {
    const exists = vi.spyOn(StellarAccount, 'exists');

    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.result).toEqual({});
    expect(exists).not.toHaveBeenCalled();
  });

  it('reports an existing wallet without a name, signature, or session', async () => {
    const exists = vi.spyOn(StellarAccount, 'exists').mockResolvedValue({ _id: 'account-id' });

    const response = await request(app)
      .get('/v1/auth/wallet/status')
      .query({ address: ` ${address.toLowerCase()} ` });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Wallet registration status',
      result: { registered: true },
    });
    expect(exists).toHaveBeenCalledWith({ address });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('reports an unregistered wallet so the client can request a name', async () => {
    vi.spyOn(StellarAccount, 'exists').mockResolvedValue(null);

    const response = await request(app).get('/v1/auth/wallet/status').query({ address });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ registered: false });
  });

  it('does not treat a database failure as an unregistered wallet', async () => {
    vi.spyOn(StellarAccount, 'exists').mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/v1/auth/wallet/status').query({ address });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.result).toEqual({});
  });
});
