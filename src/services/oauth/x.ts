import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';

import env from '../../env.js';
import Identity from '../../models/Identity.js';
import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import { enqueueXSync } from '../integration/syncQueue.js';
import XRateLimitError from '../integration/xRateLimit.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { IssuedSession } from '../../types/auth/model.js';
import XApiResponseError from '../integration/xApiResponseError.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import type {
  CompletedXOAuth,
  ConnectedXAccount,
  XAuthorizationFlow,
  XOAuthPurpose,
  XTokenResponse,
  XUser,
  XUserResponse,
} from '../../types/integration/x.js';

const OAUTH_STATE_TTL_MS = 600_000;
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_REVOKE_URL = 'https://api.x.com/2/oauth2/revoke';
const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
const X_AUTHENTICATED_USER_URL =
  'https://api.x.com/2/users/me?user.fields=created_at,description,is_identity_verified,location,profile_image_url,protected,public_metrics,url,verified,verified_type';
const assertXConfiguration = (): void => {
  if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET) {
    throw new Error('X OAuth is not configured');
  }
};
const createXAuthorization = async (
  purpose: XOAuthPurpose,
  identityId: Types.ObjectId | null,
): Promise<XAuthorizationFlow> => {
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
const createXBasicAuthorization = (): string => {
  const clientId = encodeURIComponent(env.X_CLIENT_ID);
  const clientSecret = encodeURIComponent(env.X_CLIENT_SECRET);

  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
};
const requestXToken = async (body: URLSearchParams): Promise<XTokenResponse> => {
  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: createXBasicAuthorization(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const result = (await response.json()) as XTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'X token exchange failed');
  }

  return result;
};
const exchangeXCode = async (code: string, codeVerifier: string): Promise<XTokenResponse> => {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.X_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestXToken(body);
};
const refreshXAccessToken = async (refreshToken: string): Promise<XTokenResponse> => {
  assertXConfiguration();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return requestXToken(body);
};
const revokeXAccessToken = async (accessToken: string): Promise<void> => {
  assertXConfiguration();

  const body = new URLSearchParams({ token: accessToken });
  const response = await fetch(X_REVOKE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: createXBasicAuthorization(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`X token revocation failed with status ${response.status}`);
  }
};
const getAuthenticatedXUser = async (accessToken: string): Promise<XUser> => {
  const response = await fetch(X_AUTHENTICATED_USER_URL, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    throw new XRateLimitError(response);
  }

  const result = (await response.json()) as XUserResponse;

  if (!response.ok) {
    throw new XApiResponseError(
      response.status,
      'user lookup',
      result.errors?.[0]?.detail ??
        result.errors?.[0]?.title ??
        result.detail ??
        result.title ??
        'Unknown X API error',
    );
  }

  if (!result.data) {
    throw new Error('X user lookup returned no profile');
  }

  return result.data;
};
const connectXAccount = async (
  user: XUser,
  purpose: XOAuthPurpose,
  requestedIdentityId: Types.ObjectId | null,
): Promise<ConnectedXAccount> => {
  const existingAccount = await ExternalAccount.findOne({
    provider: 'x',
    providerAccountId: user.id,
  });

  if (purpose === 'connect' && !requestedIdentityId) {
    throw new Error('Connection flow is missing an identity');
  }

  if (
    purpose === 'connect' &&
    existingAccount &&
    !existingAccount.identity.equals(requestedIdentityId)
  ) {
    throw new Error('X account is already connected to another identity');
  }

  const identityId = existingAccount?.identity ?? requestedIdentityId ?? new Types.ObjectId();

  if (!existingAccount && !requestedIdentityId) {
    await Identity.create({ _id: identityId });
  }

  const now = new Date();
  const externalAccount = await ExternalAccount.findOneAndUpdate(
    { provider: 'x', providerAccountId: user.id },
    {
      $set: {
        identity: identityId,
        username: user.username,
        displayName: user.name,
        profileUrl: `https://x.com/${user.username}`,
        avatarUrl: user.profile_image_url ?? null,
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
    throw new Error('X account connection could not be persisted');
  }

  return { identityId, externalAccount };
};
const completeXAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedXOAuth; session: IssuedSession }> => {
  assertXConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');
  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'x',
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

  const token = await exchangeXCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedXUser(accessToken);
  const account = await connectXAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccount._id, 'x', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  const syncJob = await enqueueXSync(account.externalAccount);
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
  completeXAuthorization,
  createXAuthorization,
  getAuthenticatedXUser,
  refreshXAccessToken,
  revokeXAccessToken,
};
