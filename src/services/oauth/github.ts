import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../env.js';
import Identity from '../../models/Identity.js';
import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { IssuedSession } from '../../types/auth/model.js';
import { collectGitHubData } from '../reputation/githubData.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import type {
  CompletedGitHubOAuth,
  ConnectedGitHubAccount,
  GitHubAuthorizationFlow,
  GitHubOAuthPurpose,
  GitHubTokenResponse,
  GitHubUser,
} from '../../types/integration/github.js';

const OAUTH_STATE_TTL_MS = 600_000;
const GITHUB_API_VERSION = '2026-03-10';
const GITHUB_USER_API_URL = 'https://api.github.com/user';
const GITHUB_APPLICATIONS_API_URL = 'https://api.github.com/applications';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const assertGitHubConfiguration = (): void => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub OAuth is not configured');
  }
};
const createGitHubAuthorization = async (
  purpose: GitHubOAuthPurpose,
  identityId: Types.ObjectId | null,
): Promise<GitHubAuthorizationFlow> => {
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
const requestGitHubToken = async (body: URLSearchParams): Promise<GitHubTokenResponse> => {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const result = (await response.json()) as GitHubTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'GitHub token exchange failed');
  }

  return result;
};
const exchangeGitHubCode = async (
  code: string,
  codeVerifier: string,
): Promise<GitHubTokenResponse> => {
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestGitHubToken(body);
};
const refreshGitHubAccessToken = async (refreshToken: string): Promise<GitHubTokenResponse> => {
  assertGitHubConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return requestGitHubToken(body);
};
const revokeGitHubAccessToken = async (accessToken: string): Promise<void> => {
  assertGitHubConfiguration();

  const authorization = Buffer.from(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`).toString(
    'base64',
  );
  const response = await fetch(
    `${GITHUB_APPLICATIONS_API_URL}/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        'User-Agent': 'lumenrise-api',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub token revocation failed with status ${response.status}`);
  }
};
const getAuthenticatedGitHubUser = async (accessToken: string): Promise<GitHubUser> => {
  const response = await fetch(GITHUB_USER_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'lumenrise-api',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error('GitHub user lookup failed');
  }

  return (await response.json()) as GitHubUser;
};
const connectGitHubAccount = async (
  user: GitHubUser,
  purpose: GitHubOAuthPurpose,
  requestedIdentityId: Types.ObjectId | null,
): Promise<ConnectedGitHubAccount> => {
  const providerAccountId = user.id.toString();
  const existingAccount = await ExternalAccount.findOne({ provider: 'github', providerAccountId });

  if (purpose === 'connect' && !requestedIdentityId) {
    throw new Error('Connection flow is missing an identity');
  }

  if (
    purpose === 'connect' &&
    existingAccount &&
    !existingAccount.identity.equals(requestedIdentityId)
  ) {
    throw new Error('GitHub account is already connected to another identity');
  }

  const identityId = existingAccount?.identity ?? requestedIdentityId ?? new Types.ObjectId();

  if (!existingAccount && !requestedIdentityId) {
    await Identity.create({ _id: identityId });
  }

  const now = new Date();
  const externalAccount = await ExternalAccount.findOneAndUpdate(
    { provider: 'github', providerAccountId },
    {
      $set: {
        identity: identityId,
        username: user.login,
        displayName: user.name,
        profileUrl: user.html_url,
        avatarUrl: user.avatar_url,
        status: 'connected',
        lastSyncedAt: now,
        syncLeaseUntil: null,
        disconnectedAt: null,
      },
      $setOnInsert: {
        connectedAt: now,
      },
    },
    { upsert: true, runValidators: true, new: true },
  );

  if (!externalAccount) {
    throw new Error('GitHub account connection could not be persisted');
  }

  return { identityId, externalAccountId: externalAccount._id };
};
const completeGitHubAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedGitHubOAuth; session: IssuedSession }> => {
  assertGitHubConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');
  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'github',
      stateHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).select('+codeVerifier');

  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  const token = await exchangeGitHubCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedGitHubUser(accessToken);
  const account = await connectGitHubAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccountId, 'github', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1_000)
      : null,
  });

  await collectGitHubData(account.identityId, account.externalAccountId, user, accessToken);

  const session = await issueSession(account.identityId);

  return {
    connection: {
      identityId: account.identityId.toString(),
      username: user.login,
    },
    session,
  };
};

export {
  completeGitHubAuthorization,
  createGitHubAuthorization,
  getAuthenticatedGitHubUser,
  refreshGitHubAccessToken,
  revokeGitHubAccessToken,
};
