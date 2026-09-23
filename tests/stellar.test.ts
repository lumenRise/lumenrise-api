import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('Stellar account overview route', () => {
  it('requires a session', async () => {
    const response = await request(app).get(
      '/v1/stellar/accounts/GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
    );

    expect(response.status).toBe(401);
  });
});
