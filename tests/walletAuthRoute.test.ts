import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { createWalletChallenge } from '../src/services/auth/walletChallenge.js';
import {
  loginWalletIdentity,
  registerWalletIdentity,
} from '../src/services/auth/walletIdentity.js';

vi.mock('../src/services/auth/walletChallenge.js', () => ({ createWalletChallenge: vi.fn() }));
vi.mock('../src/services/auth/walletIdentity.js', () => ({
  loginWalletIdentity: vi.fn(),
  registerWalletIdentity: vi.fn(),
}));

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('wallet authentication routes', () => {
  it('requires a valid wallet address and purpose for a challenge', async () => {
    const response = await request(app).post('/v1/auth/wallet/challenge').send({
      address: 'invalid',
      purpose: 'register',
    });

    expect(response.status).toBe(400);
    expect(createWalletChallenge).not.toHaveBeenCalled();
  });

  it('starts a generic wallet-signing challenge', async () => {
    vi.mocked(createWalletChallenge).mockResolvedValue({
      challengeId: '507f1f77bcf86cd799439011',
      address,
      purpose: 'register',
      unsignedTransaction: 'AAAA',
      networkPassphrase: 'Test SDF Network ; September 2015',
      expiresAt: new Date().toISOString(),
    });

    const response = await request(app).post('/v1/auth/wallet/challenge').send({
      address,
      purpose: 'register',
      name: 'Alice',
    });

    expect(response.status).toBe(201);
    expect(response.body.result).toMatchObject({ address, purpose: 'register' });
  });

  it('never registers when the signed proof is invalid', async () => {
    vi.mocked(registerWalletIdentity).mockResolvedValue({ ok: false, reason: 'invalid_proof' });

    const response = await request(app).post('/v1/auth/wallet/register').send({
      address,
      name: 'Alice',
      challengeId: '507f1f77bcf86cd799439011',
      signedTransaction: 'AAAA',
    });

    expect(response.status).toBe(401);
    expect(response.body.result).toEqual({});
  });

  it('returns a JWT after successful wallet login', async () => {
    vi.mocked(loginWalletIdentity).mockResolvedValue({
      ok: true,
      result: {
        identityId: '507f1f77bcf86cd799439011',
        address,
        name: 'Alice',
        accessToken: 'signed.jwt.token',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const response = await request(app).post('/v1/auth/wallet/login').send({
      address,
      challengeId: '507f1f77bcf86cd799439011',
      signedTransaction: 'AAAA',
    });

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({ address, tokenType: 'Bearer' });
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('does not permit secondary providers to register an identity', async () => {
    for (const provider of ['github', 'gitlab', 'x']) {
      const response = await request(app).get(`/v1/oauth/${provider}/start`);

      expect(response.status).toBe(410);
    }
  });
});
