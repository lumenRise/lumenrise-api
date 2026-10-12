import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app';
import Identity from '../src/models/Identity';

const identityId = new Types.ObjectId();

describe('Auth provider user ID authentication', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('identifies an active user locally without a session or Auth provider request', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const lookup = vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: identityId, status: 'active' }),
    } as never);
    const response = await request(app).get('/v1/auth/session').set('X-User-Id', '42');
    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ identityId: identityId.toString(), userId: '42' });
    expect(lookup).toHaveBeenCalledWith({ externalUserId: '42' });
    expect(fetch).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('ignores legacy bearer tokens and session cookies', async () => {
    const lookup = vi.spyOn(Identity, 'findOne');
    const response = await request(app)
      .get('/v1/auth/session')
      .set('Authorization', 'Bearer old.jwt.token')
      .set('Cookie', 'lumenrise_session=old-cookie');
    expect(response.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(['invalid', '0', '-1', '42.0', '042', '9007199254740992'])(
    'rejects invalid IDs: %s',
    async (id) => {
      const lookup = vi.spyOn(Identity, 'findOne');
      expect((await request(app).get('/v1/auth/session').set('X-User-Id', id)).status).toBe(401);
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it.each(['suspended', 'deleted'])('rejects %s identities', async (status) => {
    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: identityId, status }),
    } as never);
    expect((await request(app).get('/v1/auth/session').set('X-User-Id', '42')).status).toBe(403);
  });

  it('rejects an unregistered ID', async () => {
    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);
    expect((await request(app).get('/v1/auth/session').set('X-User-Id', '42')).status).toBe(401);
  });
});
