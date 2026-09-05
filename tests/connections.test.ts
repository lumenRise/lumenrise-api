import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('connections', () => {
  it('requires a Lumenrise session to list connections', async () => {
    const response = await request(app).get('/v1/connections');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to disconnect a provider', async () => {
    const response = await request(app).delete('/v1/connections/github');

    expect(response.status).toBe(401);
  });
});
