import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { hashSessionToken } from '../src/services/auth/session.js';

describe('authentication', () => {
  it('hashes opaque session tokens deterministically without storing the raw value', () => {
    const hash = hashSessionToken('opaque-token');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashSessionToken('opaque-token'));
    expect(hash).not.toContain('opaque-token');
  });

  it('requires a session cookie for the current session endpoint', async () => {
    const response = await request(app).get('/v1/auth/session');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Authentication required',
      result: {},
    });
  });
});
