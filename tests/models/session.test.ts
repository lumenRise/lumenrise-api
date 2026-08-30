import { Types } from 'mongoose';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import Session from '../../src/models/Session.js';

const TOKEN_HASH = createHash('sha256').update('session-token').digest('hex');

describe('Session model', () => {
  it('accepts a hashed, expiring identity session', async () => {
    const now = new Date();
    const session = new Session({
      identity: new Types.ObjectId(),
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(now.getTime() + 60_000),
      lastSeenAt: now,
    });

    await session.validate();

    expect(session.revokedAt).toBeNull();
    expect(session.tokenHash).toBe(TOKEN_HASH);
  });

  it('rejects a raw token in the persistence field', async () => {
    const session = new Session({
      identity: new Types.ObjectId(),
      tokenHash: 'raw-session-token',
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    });

    await expect(session.validate()).rejects.toMatchObject({
      errors: {
        tokenHash: expect.anything(),
      },
    });
  });

  it('declares token uniqueness and automatic expiration indexes', () => {
    expect(Session.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { tokenHash: 1 },
          expect.objectContaining({ unique: true, name: 'sessions_token_hash_unique' }),
        ],
        [
          { expiresAt: 1 },
          expect.objectContaining({ expireAfterSeconds: 0, name: 'sessions_expiry_ttl' }),
        ],
      ]),
    );
  });
});
