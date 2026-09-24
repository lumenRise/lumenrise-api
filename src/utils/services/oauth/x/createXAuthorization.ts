import type { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../../../env.js';
import OAuthState from '../../../../models/OAuthState.js';
import { assertXConfiguration } from './assertXConfiguration.js';
import { X_AUTHORIZE_URL } from '../../../../constants/services/oauth/x.js';
import { OAUTH_STATE_TTL_MS } from '../../../../constants/services/oauth/x.js';
import type { XAuthorizationFlow, XOAuthPurpose } from '../../../../types/integration/x.js';

const createXAuthorization = async (
  purpose: XOAuthPurpose,
  identityId: Types.ObjectId | null,
): Promise<XAuthorizationFlow> => {
  if (purpose !== 'connect' || !identityId) {
    throw new Error('Wallet registration is required before connecting X');
  }

  assertXConfiguration();

  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const stateHash = createHash('sha256').update(state).digest('hex');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  const authorizationUrl = new URL(X_AUTHORIZE_URL);

  await OAuthState.create({
    identity: identityId,
    provider: 'x',
    purpose,
    stateHash,
    codeChallenge,
    codeVerifier,
    redirectUri: env.X_CALLBACK_URL,
    expiresAt,
  });

  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', env.X_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', env.X_CALLBACK_URL);
  authorizationUrl.searchParams.set('scope', 'users.read tweet.read offline.access');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
  };
};

export { createXAuthorization };
