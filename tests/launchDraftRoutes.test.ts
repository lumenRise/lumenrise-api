import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';

describe('launches without drafts', () => {
  it('does not accept draft creation, updates, or submission', async () => {
    const draftId = '507f1f77bcf86cd799439011';
    expect((await request(app).post('/v1/launches/drafts').send({})).status).toBe(404);
    expect((await request(app).patch(`/v1/launches/drafts/${draftId}`).send({})).status).toBe(404);
    expect((await request(app).post(`/v1/launches/drafts/${draftId}/submit`).send({})).status).toBe(
      404,
    );
  });
});
