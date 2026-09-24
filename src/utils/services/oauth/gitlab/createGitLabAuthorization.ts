import type { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../../../env.js';
import { getGitLabUrl } from './getGitLabUrl.js';
import OAuthState from '../../../../models/OAuthState.js';
import { assertGitLabConfiguration } from './assertGitLabConfiguration.js';
import { OAUTH_STATE_TTL_MS } from '../../../../constants/services/oauth/gitlab.js';
import type {
  GitLabAuthorizationFlow,
  GitLabOAuthPurpose,
} from '../../../../types/integration/gitlab.js';

const createGitLabAuthorization = async (
  purpose: GitLabOAuthPurpose,
  identityId: Types.ObjectId | null,
): Promise<GitLabAuthorizationFlow> => {
  if (purpose !== 'connect' || !identityId) {
    throw new Error('Wallet registration is required before connecting GitLab');
  }

  assertGitLabConfiguration();

  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const stateHash = createHash('sha256').update(state).digest('hex');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  const authorizationUrl = new URL(getGitLabUrl('/oauth/authorize'));

  await OAuthState.create({
    identity: identityId,
    provider: 'gitlab',
    purpose,
    stateHash,
    codeChallenge,
    codeVerifier,
    redirectUri: env.GITLAB_CALLBACK_URL,
    expiresAt,
  });

  authorizationUrl.searchParams.set('client_id', env.GITLAB_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', env.GITLAB_CALLBACK_URL);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('scope', 'read_user read_api');

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
  };
};

export { createGitLabAuthorization };
