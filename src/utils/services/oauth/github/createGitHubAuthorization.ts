import type { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../../../env.js';
import OAuthState from '../../../../models/OAuthState.js';
import { assertGitHubConfiguration } from './assertGitHubConfiguration.js';
import { OAUTH_STATE_TTL_MS } from '../../../../constants/services/oauth/github.js';
import { GITHUB_AUTHORIZE_URL } from '../../../../constants/services/oauth/github.js';
import type {
  GitHubAuthorizationFlow,
  GitHubOAuthPurpose,
} from '../../../../types/integration/github.js';

const createGitHubAuthorization = async (
  purpose: GitHubOAuthPurpose,
  identityId: Types.ObjectId | null,
): Promise<GitHubAuthorizationFlow> => {
  if (purpose !== 'connect' || !identityId) {
    throw new Error('Wallet registration is required before connecting GitHub');
  }

  assertGitHubConfiguration();

  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const stateHash = createHash('sha256').update(state).digest('hex');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  const authorizationUrl = new URL(GITHUB_AUTHORIZE_URL);

  await OAuthState.create({
    identity: identityId,
    provider: 'github',
    purpose,
    stateHash,
    codeChallenge,
    codeVerifier,
    redirectUri: env.GITHUB_CALLBACK_URL,
    expiresAt,
  });

  authorizationUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', env.GITHUB_CALLBACK_URL);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('prompt', 'select_account');
  authorizationUrl.searchParams.set('scope', 'read:user');

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
  };
};

export { createGitHubAuthorization };
