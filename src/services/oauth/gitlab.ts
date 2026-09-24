import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../env.js';
import Identity from '../../models/Identity.js';
import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { IssuedSession } from '../../types/auth/model.js';
import { enqueueGitLabSync } from '../integration/syncQueue.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import type {
  CompletedGitLabOAuth,
  ConnectedGitLabAccount,
  GitLabAuthorizationFlow,
  GitLabOAuthPurpose,
  GitLabTokenResponse,
  GitLabUser,
} from '../../types/integration/gitlab.js';

const OAUTH_STATE_TTL_MS = 600_000;
const getGitLabUrl = (path: string): string => new URL(path, env.GITLAB_BASE_URL).toString();

const assertGitLabConfiguration = (): void => {
  if (!env.GITLAB_CLIENT_ID || !env.GITLAB_CLIENT_SECRET) {
    throw new Error('GitLab OAuth is not configured');
  }
};

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
const requestGitLabToken = async (body: URLSearchParams): Promise<GitLabTokenResponse> => {
  const response = await fetch(getGitLabUrl('/oauth/token'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const result = (await response.json()) as GitLabTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'GitLab token exchange failed');
  }

  return result;
};
const exchangeGitLabCode = async (
  code: string,
  codeVerifier: string,
): Promise<GitLabTokenResponse> => {
  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.GITLAB_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestGitLabToken(body);
};
const refreshGitLabAccessToken = async (refreshToken: string): Promise<GitLabTokenResponse> => {
  assertGitLabConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: env.GITLAB_CALLBACK_URL,
  });

  return requestGitLabToken(body);
};
const revokeGitLabAccessToken = async (accessToken: string): Promise<void> => {
  assertGitLabConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    token: accessToken,
  });

  const response = await fetch(getGitLabUrl('/oauth/revoke'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`GitLab token revocation failed with status ${response.status}`);
  }
};

const getAuthenticatedGitLabUser = async (accessToken: string): Promise<GitLabUser> => {
  const response = await fetch(getGitLabUrl('/api/v4/user'), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('GitLab user lookup failed');
  }

  return (await response.json()) as GitLabUser;
};
const connectGitLabAccount = async (
  user: GitLabUser,
  purpose: GitLabOAuthPurpose,
  requestedIdentityId: Types.ObjectId | null,
): Promise<ConnectedGitLabAccount> => {
  const providerAccountId = user.id.toString();
  const existingAccount = await ExternalAccount.findOne({ provider: 'gitlab', providerAccountId });

  if (purpose === 'connect' && !requestedIdentityId) {
    throw new Error('Connection flow is missing an identity');
  }

  if (
    purpose === 'connect' &&
    existingAccount &&
    !existingAccount.identity.equals(requestedIdentityId)
  ) {
    throw new Error('GitLab account is already connected to another identity');
  }

  const identityId = existingAccount?.identity ?? requestedIdentityId ?? new Types.ObjectId();

  if (!existingAccount && !requestedIdentityId) {
    await Identity.create({ _id: identityId });
  }

  const now = new Date();

  const externalAccount = await ExternalAccount.findOneAndUpdate(
    { provider: 'gitlab', providerAccountId },
    {
      $set: {
        identity: identityId,
        username: user.username,
        displayName: user.name,
        profileUrl: user.web_url,
        avatarUrl: user.avatar_url,
        status: 'connected',
        syncLeaseUntil: null,
        disconnectedAt: null,
      },
      $setOnInsert: {
        connectedAt: now,
      },
    },
    { upsert: true, runValidators: true, returnDocument: 'after' },
  );

  if (!externalAccount) {
    throw new Error('GitLab account connection could not be persisted');
  }

  return { identityId, externalAccount };
};

const completeGitLabAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedGitLabOAuth; session: IssuedSession }> => {
  assertGitLabConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');

  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'gitlab',
      stateHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' },
  ).select('+codeVerifier');

  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  if (oauthState.purpose !== 'connect' || !oauthState.identity) {
    throw new Error('Wallet registration is required before connecting GitLab');
  }

  const token = await exchangeGitLabCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedGitLabUser(accessToken);
  const account = await connectGitLabAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccount._id, 'gitlab', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  const syncJob = await enqueueGitLabSync(account.externalAccount);
  const session = await issueSession(account.identityId);

  return {
    connection: {
      identityId: account.identityId.toString(),
      username: user.username,
      syncJobId: syncJob._id.toString(),
    },
    session,
  };
};

export {
  completeGitLabAuthorization,
  createGitLabAuthorization,
  getAuthenticatedGitLabUser,
  refreshGitLabAccessToken,
  revokeGitLabAccessToken,
};
