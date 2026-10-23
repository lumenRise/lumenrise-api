import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import Identity from '../src/models/Identity';

const identityId = new Types.ObjectId();

describe('registration status', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports an unknown user as unregistered without contacting the provider', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const lookup = vi
      .spyOn(Identity, 'findOne')
      .mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const response = await request(app).get('/v1/auth/status').set('X-User-Id', '42');
    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ registered: false, userId: '42' });
    expect(lookup).toHaveBeenCalledWith({ externalUserIds: '42' });
    expect(fetch).not.toHaveBeenCalled();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns an existing user profile without creating credentials', async () => {
    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue({ _id: identityId, status: 'active', name: 'Alice', avatarUrl: null }),
    } as never);
    const response = await request(app).get('/v1/auth/status').set('X-User-Id', '42');
    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      registered: true,
      userId: '42',
      identityId: identityId.toString(),
      name: 'Alice',
      avatarUrl: null,
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it.each(['suspended', 'deleted'])(
    'does not treat a %s identity as a new user',
    async (status) => {
      vi.spyOn(Identity, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: identityId, status }),
      } as never);
      expect((await request(app).get('/v1/auth/status').set('X-User-Id', '42')).status).toBe(403);
    },
  );

  it('does not treat a database outage as an unregistered user', async () => {
    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error('Unavailable')),
    } as never);
    const response = await request(app).get('/v1/auth/status').set('X-User-Id', '42');
    expect(response.status).toBe(503);
    expect(response.body.result).not.toHaveProperty('registered');
  });

  it('rejects missing and invalid IDs before database access', async () => {
    const lookup = vi.spyOn(Identity, 'findOne');
    expect((await request(app).get('/v1/auth/status')).status).toBe(400);
    expect((await request(app).get('/v1/auth/status').set('X-User-Id', 'invalid')).status).toBe(
      400,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('does not expose a separate login endpoint', async () => {
    expect((await request(app).post('/v1/auth/login').send({ userId: '42' })).status).toBe(404);
  });
  it('requires registration completion for an existing identity without a name', async () => {
    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: identityId, status: 'active', name: null }),
    } as never);
    const response = await request(app).get('/v1/auth/status').set('X-User-Id', '42');
    expect(response.status).toBe(200);
    expect(response.body.result.registered).toBe(false);
  });
});
