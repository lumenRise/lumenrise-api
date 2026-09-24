import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Session from '../../src/models/Session.js';
import { issueWalletSession, verifyWalletToken } from '../../src/services/auth/walletToken.js';

describe('wallet JWT session', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a verifiable JWT bound to a stored revocable session', async () => {
    const create = vi.spyOn(Session, 'create').mockResolvedValue([] as never);
    const identityId = new Types.ObjectId();
    const session = await issueWalletSession(identityId);
    const payload = verifyWalletToken(session.token);

    expect(payload).toMatchObject({
      iss: 'lumenrise-api',
      aud: 'lumenrise-client',
      sub: identityId.toString(),
      sid: session.sessionId.toString(),
    });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        _id: session.sessionId,
        identity: identityId,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
  });

  it('rejects tampered and malformed tokens', async () => {
    vi.spyOn(Session, 'create').mockResolvedValue([] as never);
    const session = await issueWalletSession(new Types.ObjectId());
    const parts = session.token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: new Types.ObjectId().toString() })).toString(
      'base64url',
    );

    expect(verifyWalletToken(`${parts[0]}.${payload}.${parts[2]}`)).toBeNull();
    expect(verifyWalletToken('invalid')).toBeNull();
  });
});
