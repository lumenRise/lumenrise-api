import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('reputation', () => {
  it('requires a session to retrieve GitLab reputation data', async () => {
    const response = await request(app).get('/v1/reputation/developer/gitlab');

    expect(response.status).toBe(401);
  });

  it('requires a session to retrieve GitLab projects', async () => {
    const response = await request(app).get('/v1/reputation/developer/gitlab/projects');

    expect(response.status).toBe(401);
  });

  it('requires a session to retrieve GitLab events', async () => {
    const response = await request(app).get('/v1/reputation/developer/gitlab/events');

    expect(response.status).toBe(401);
  });
});
