import type { Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount.js';
import { collectGitHubData } from '../reputation/githubData.js';
import type { GitHubSyncOutcome } from '../../types/integration/sync.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import { getProviderCredential, storeProviderCredential } from './providerCredential.js';
import { getAuthenticatedGitHubUser, refreshGitHubAccessToken } from '../oauth/github.js';
import { GITHUB_SYNC_LEASE_MS, GITHUB_SYNC_MIN_INTERVAL_MS } from '../../constants/integration.js';

const TOKEN_REFRESH_WINDOW_MS = 300_000;
const getRetryAfterSeconds = (availableAt: Date, now = new Date()): number =>
  Math.max(1, Math.ceil((availableAt.getTime() - now.getTime()) / 1_000));
const needsCredentialRefresh = (expiresAt: Date | null, now = new Date()): boolean =>
  expiresAt !== null && expiresAt.getTime() <= now.getTime() + TOKEN_REFRESH_WINDOW_MS;
const resolveGitHubAccessToken = async (
  externalAccountId: Types.ObjectId,
): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'github') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (
    !credential.refreshToken ||
    (credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt <= new Date())
  ) {
    return null;
  }

  const token = await refreshGitHubAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'github', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1_000)
      : credential.refreshTokenExpiresAt,
  });

  return accessToken;
};
const syncGitHubAccount = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<GitHubSyncOutcome> => {
  const nextSyncAt = account.lastSyncedAt
    ? new Date(account.lastSyncedAt.getTime() + GITHUB_SYNC_MIN_INTERVAL_MS)
    : now;

  if (nextSyncAt > now) {
    return {
      state: 'too_recent',
      retryAfterSeconds: getRetryAfterSeconds(nextSyncAt, now),
    };
  }

  const syncLeaseUntil = new Date(now.getTime() + GITHUB_SYNC_LEASE_MS);
  const leasedAccount = await ExternalAccount.findOneAndUpdate(
    {
      _id: account._id,
      status: 'connected',
      $or: [{ syncLeaseUntil: null }, { syncLeaseUntil: { $lte: now } }],
      lastSyncedAt: account.lastSyncedAt,
    },
    { $set: { syncLeaseUntil } },
    { returnDocument: 'after' },
  );

  if (!leasedAccount) {
    const currentAccount = await ExternalAccount.findById(account._id).select(
      'lastSyncedAt syncLeaseUntil',
    );
    const retryAt = currentAccount?.syncLeaseUntil ?? new Date(now.getTime() + 1_000);

    return {
      state: 'in_progress',
      retryAfterSeconds: getRetryAfterSeconds(retryAt, now),
    };
  }

  try {
    const accessToken = await resolveGitHubAccessToken(leasedAccount._id);

    if (!accessToken) {
      return { state: 'reauthorization_required' };
    }

    const user = await getAuthenticatedGitHubUser(accessToken);

    if (user.id.toString() !== leasedAccount.providerAccountId) {
      throw new Error('Stored GitHub credential does not match the connected account');
    }

    const snapshot = await collectGitHubData(
      leasedAccount.identity,
      leasedAccount._id,
      user,
      accessToken,
    );

    await ExternalAccount.updateOne(
      { _id: leasedAccount._id, status: 'connected' },
      {
        $set: {
          username: user.login,
          displayName: user.name,
          profileUrl: user.html_url,
          avatarUrl: user.avatar_url,
          lastSyncedAt: snapshot.collectedAt,
        },
      },
      { runValidators: true },
    );

    return { state: 'synchronized', snapshot };
  } finally {
    await ExternalAccount.updateOne(
      { _id: leasedAccount._id, syncLeaseUntil },
      { $set: { syncLeaseUntil: null } },
    );
  }
};

export { getRetryAfterSeconds, needsCredentialRefresh, syncGitHubAccount };
