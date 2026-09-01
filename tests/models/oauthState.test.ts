import { Types } from 'mongoose';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import OAuthState from '../../src/models/OAuthState.js';

const CODE_VERIFIER = 'a'.repeat(43);
const STATE_HASH = createHash('sha256').update('oauth-state').digest('hex');
const CODE_CHALLENGE = createHash('sha256').update(CODE_VERIFIER).digest('base64url');

describe('OAuthState model', () => {
  it('accepts a short-lived registration state without an identity', async () => {
    const state = new OAuthState({
      identity: null,
      provider: 'gitlab',
      purpose: 'register',
      stateHash: STATE_HASH,
      codeChallenge: CODE_CHALLENGE,
      codeVerifier: CODE_VERIFIER,
      redirectUri: 'https://app.lumenrise.example/oauth/callback',
      expiresAt: new Date(Date.now() + 600_000),
    });

    await state.validate();

    expect(state.identity).toBeNull();
    expect(state.consumedAt).toBeNull();
  });

  it('requires an identity when connecting another provider', async () => {
    const state = new OAuthState({
      identity: null,
      provider: 'github',
      purpose: 'connect',
      stateHash: STATE_HASH,
      codeChallenge: CODE_CHALLENGE,
      codeVerifier: CODE_VERIFIER,
      redirectUri: 'https://app.lumenrise.example/oauth/callback',
      expiresAt: new Date(Date.now() + 600_000),
    });

    await expect(state.validate()).rejects.toMatchObject({
      errors: {
        identity: expect.anything(),
      },
    });
  });

  it('declares state uniqueness and automatic expiration indexes', () => {
    const identity = new Types.ObjectId();
    const state = new OAuthState({ identity });

    expect(state.identity).toEqual(identity);
    expect(OAuthState.schema.path('codeVerifier').options.select).toBe(false);
    expect(OAuthState.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { stateHash: 1 },
          expect.objectContaining({ unique: true, name: 'oauth_states_state_hash_unique' }),
        ],
        [
          { expiresAt: 1 },
          expect.objectContaining({ expireAfterSeconds: 0, name: 'oauth_states_expiry_ttl' }),
        ],
      ]),
    );
  });
});
