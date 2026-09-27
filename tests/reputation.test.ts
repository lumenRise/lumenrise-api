import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('reputation', () => {
  it('requires a session to retrieve the reputation profile', async () => {
    const response = await request(app).get('/v1/reputation/profile');

    expect(response.status).toBe(401);
  });

  it('requires a session to retrieve the developer score', async () => {
    const response = await request(app).get('/v1/reputation/developer/score');

    expect(response.status).toBe(401);
  });

  it('requires a session to retrieve the social score', async () => {
    const response = await request(app).get('/v1/reputation/social/score');

    expect(response.status).toBe(401);
  });



});
