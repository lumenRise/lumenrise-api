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

  it('requires a Lumenrise session to synchronize GitHub data', async () => {
    const response = await request(app).post('/v1/connections/github/sync');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to synchronize GitLab data', async () => {
    const response = await request(app).post('/v1/connections/gitlab/sync');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to synchronize X data', async () => {
    const response = await request(app).post('/v1/connections/x/sync');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to retrieve a synchronization job', async () => {
    const response = await request(app).get('/v1/connections/github/sync/66f17f34f312f37c76c62e11');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to retrieve a GitLab synchronization job', async () => {
    const response = await request(app).get('/v1/connections/gitlab/sync/66f17f34f312f37c76c62e11');

    expect(response.status).toBe(401);
  });

  it('requires a Lumenrise session to retrieve an X synchronization job', async () => {
    const response = await request(app).get('/v1/connections/x/sync/66f17f34f312f37c76c62e11');

    expect(response.status).toBe(401);
  });
});
