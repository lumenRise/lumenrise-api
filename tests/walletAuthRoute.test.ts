import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';

describe('retired wallet authentication', () => {
  it.each(['challenge', 'register', 'login'])('does not expose /wallet/%s', async (path) => {
    const response = await request(app).post(`/v1/auth/wallet/${path}`).send({});
    expect(response.status).toBe(404);
  });
  it('does not expose the old wallet status lookup', async () => {
    expect((await request(app).get('/v1/auth/wallet/status')).status).toBe(404);
  });
});
