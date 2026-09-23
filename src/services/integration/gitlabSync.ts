import type { Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount.js';
import { collectGitLabData } from '../reputation/gitlabData.js';
import type { GitLabSyncOutcome } from '../../types/integration/sync.js';
import { getRetryAfterSeconds, needsCredentialRefresh } from './githubSync.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import { getProviderCredential, storeProviderCredential } from './providerCredential.js';
import { getAuthenticatedGitLabUser, refreshGitLabAccessToken } from '../oauth/gitlab.js';
import { GITLAB_SYNC_LEASE_MS, GITLAB_SYNC_MIN_INTERVAL_MS } from '../../constants/integration.js';

const resolveGitLabAccessToken = async (
  externalAccountId: Types.ObjectId,
): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'gitlab') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (!credential.refreshToken) {
    return null;
  }

  const token = await refreshGitLabAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'gitlab', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  return accessToken;
};
const syncGitLabAccount = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<GitLabSyncOutcome> => {
  const nextSyncAt = account.lastSyncedAt
    ? new Date(account.lastSyncedAt.getTime() + GITLAB_SYNC_MIN_INTERVAL_MS)
    : now;

  if (nextSyncAt > now) {
    return {
      state: 'too_recent',
      retryAfterSeconds: getRetryAfterSeconds(nextSyncAt, now),
    };
  }

  const syncLeaseUntil = new Date(now.getTime() + GITLAB_SYNC_LEASE_MS);
  const leasedAccount = await ExternalAccount.findOneAndUpdate(
    {
      _id: account._id,
      provider: 'gitlab',
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
    const accessToken = await resolveGitLabAccessToken(leasedAccount._id);

    if (!accessToken) {
      return { state: 'reauthorization_required' };
    }

    const user = await getAuthenticatedGitLabUser(accessToken);

    if (user.id.toString() !== leasedAccount.providerAccountId) {
      throw new Error('Stored GitLab credential does not match the connected account');
    }

    const snapshot = await collectGitLabData(
      leasedAccount.identity,
      leasedAccount._id,
      user,
      accessToken,
    );

    await ExternalAccount.updateOne(
      { _id: leasedAccount._id, provider: 'gitlab', status: 'connected' },
      {
        $set: {
          username: user.username,
          displayName: user.name,
          profileUrl: user.web_url,
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

export { resolveGitLabAccessToken, syncGitLabAccount };
