import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import Session from '../src/models/Session.js';
import Identity from '../src/models/Identity.js';
import { issueWalletSession } from '../src/services/auth/walletToken.js';

describe('wallet bearer authentication', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticates a valid JWT against its revocable database session', async () => {
    const identityId = new Types.ObjectId();

    vi.spyOn(Session, 'create').mockResolvedValue([] as never);
    const issued = await issueWalletSession(identityId);
    const save = vi.fn().mockResolvedValue(undefined);
    const findSession = vi.spyOn(Session, 'findOne').mockResolvedValue({
      _id: issued.sessionId,
      identity: identityId,
      expiresAt: issued.expiresAt,
      lastSeenAt: new Date(),
      save,
    } as never);

    vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: identityId }),
    } as never);
    vi.spyOn(Session, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ expiresAt: issued.expiresAt }),
    } as never);

    const response = await request(app)
      .get('/v1/auth/session')
      .set('Authorization', `Bearer ${issued.token}`);

    expect(response.status).toBe(200);
    expect(response.body.result.identityId).toBe(identityId.toString());
    expect(findSession).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: issued.sessionId.toString(),
        identity: identityId.toString(),
      }),
    );
    expect(save).toHaveBeenCalledOnce();
  });

  it('rejects a tampered bearer even if another cookie exists', async () => {
    const findSession = vi.spyOn(Session, 'findOne');
    const response = await request(app)
      .get('/v1/auth/session')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .set('Cookie', 'lumenrise_session=some-cookie');

    expect(response.status).toBe(401);
    expect(findSession).not.toHaveBeenCalled();
  });
});
