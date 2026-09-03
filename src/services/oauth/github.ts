import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../env.js';
import Identity from '../../models/Identity.js';
import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { IssuedSession } from '../../types/auth/model.js';
import { createGitHubDeveloperSnapshot } from '../reputation/developer.js';
import type { GitHubDeveloperMetrics } from '../../types/reputation/model.js';
import type {
  CompletedGitHubOAuth,
  GitHubAuthorizationFlow,
  GitHubEvent,
  GitHubOAuthPurpose,
  GitHubTokenResponse,
  GitHubRepository,
  GitHubUser,
} from '../../types/integration/github.js';

const OAUTH_STATE_TTL_MS = 600_000;
const GITHUB_API_VERSION = '2026-03-10';
const GITHUB_USER_API_URL = 'https://api.github.com/user';
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

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
  };
};
const exchangeGitHubCode = async (code: string, codeVerifier: string): Promise<string> => {
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    code_verifier: codeVerifier,
  });
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

  return result.access_token;
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
const getGitHubJson = async <T>(url: string, accessToken: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'lumenrise-api',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error('GitHub reputation data lookup failed');
  }

  return (await response.json()) as T;
};
const collectGitHubDeveloperMetrics = async (
  user: GitHubUser,
  accessToken: string,
  observedAt: Date,
): Promise<GitHubDeveloperMetrics> => {
  const username = encodeURIComponent(user.login);
  const repositoriesUrl = `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100`;
  const eventsUrl = `https://api.github.com/users/${username}/events/public?per_page=100`;
  const [repositoriesResult, eventsResult] = await Promise.allSettled([
    getGitHubJson<GitHubRepository[]>(repositoriesUrl, accessToken),
    getGitHubJson<GitHubEvent[]>(eventsUrl, accessToken),
  ]);
  const accountCreatedAt = new Date(user.created_at);
  const repositories =
    repositoriesResult.status === 'fulfilled' && Array.isArray(repositoriesResult.value)
      ? repositoriesResult.value
      : null;
  const events =
    eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value)
      ? eventsResult.value
      : null;
  const accountAgeDays = Math.max(
    0,
    Math.floor((observedAt.getTime() - accountCreatedAt.getTime()) / 86_400_000),
  );
  const sampledOriginalRepositoryStars =
    repositories !== null
      ? repositories
          .filter((repository) => !repository.fork)
          .reduce((total, repository) => total + repository.stargazers_count, 0)
      : null;
  const recentPublicEventCount = events?.length ?? null;

  return {
    accountAgeDays,
    publicRepositoryCount: user.public_repos,
    recentPublicEventCount,
    sampledOriginalRepositoryStars,
  };
};
const connectGitHubAccount = async (
  user: GitHubUser,
  purpose: GitHubOAuthPurpose,
  requestedIdentityId: Types.ObjectId | null,
): Promise<Types.ObjectId> => {
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

  await ExternalAccount.findOneAndUpdate(
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
        disconnectedAt: null,
      },
      $setOnInsert: {
        connectedAt: now,
      },
    },
    { upsert: true, runValidators: true },
  );

  return identityId;
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

  const accessToken = await exchangeGitHubCode(code, oauthState.codeVerifier);
  const user = await getAuthenticatedGitHubUser(accessToken);
  const identityId = await connectGitHubAccount(user, oauthState.purpose, oauthState.identity);
  const calculatedAt = new Date();
  const metrics = await collectGitHubDeveloperMetrics(user, accessToken, calculatedAt);

  await createGitHubDeveloperSnapshot(identityId, metrics, calculatedAt);

  const session = await issueSession(identityId);

  return {
    connection: {
      identityId: identityId.toString(),
      username: user.login,
    },
    session,
  };
};

export { completeGitHubAuthorization, createGitHubAuthorization };
