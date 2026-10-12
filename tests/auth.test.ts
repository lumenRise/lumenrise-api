import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';

describe('authentication', () => {
  it('requires a user ID for the current user endpoint', async () => {
    const response = await request(app).get('/v1/auth/session');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Authentication required',
      result: {},
    });
  });
});
