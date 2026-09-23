import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Stellar account route responses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects an invalid account address', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/v1/stellar/accounts/not-a-wallet');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid Stellar account address');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distinguishes a missing account from an unavailable provider', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    vi.stubGlobal('fetch', fetchMock);

    const missing = await request(app).get(`/v1/stellar/accounts/${address}`);
    const unavailable = await request(app).get(`/v1/stellar/accounts/${address}`);

    expect(missing.status).toBe(404);
    expect(unavailable.status).toBe(502);
  });

  it('rejects invalid operation pagination parameters', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get(`/v1/stellar/accounts/${address}/operations?limit=201`);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
