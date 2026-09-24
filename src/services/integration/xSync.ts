import type { Types } from 'mongoose';

import { collectXData } from '../reputation/xData.js';
import XDataSnapshot from '../../models/XDataSnapshot.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import type { XSyncOutcome } from '../../types/integration/sync.js';
import { getAuthenticatedXUser, refreshXAccessToken } from '../oauth/x.js';
import { getRetryAfterSeconds, needsCredentialRefresh } from './githubSync.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import { calculateAndStoreSocialReputation } from '../reputation/socialScore.js';
import { getProviderCredential, storeProviderCredential } from './providerCredential.js';
import { X_SYNC_LEASE_MS, X_SYNC_MIN_INTERVAL_MS } from '../../constants/integration.js';

const resolveXAccessToken = async (externalAccountId: Types.ObjectId): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'x') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (!credential.refreshToken) {
    return null;
  }

  const token = await refreshXAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'x', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  return accessToken;
};

const syncXAccount = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<XSyncOutcome> => {
  const nextSyncAt = account.lastSyncedAt
    ? new Date(account.lastSyncedAt.getTime() + X_SYNC_MIN_INTERVAL_MS)
    : now;

  if (nextSyncAt > now) {
    return {
      state: 'too_recent',
      retryAfterSeconds: getRetryAfterSeconds(nextSyncAt, now),
    };
  }

  const syncLeaseUntil = new Date(now.getTime() + X_SYNC_LEASE_MS);

  const leasedAccount = await ExternalAccount.findOneAndUpdate(
    {
      _id: account._id,
      provider: 'x',
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
    const accessToken = await resolveXAccessToken(leasedAccount._id);

    if (!accessToken) {
      return { state: 'reauthorization_required' };
    }

    const user = await getAuthenticatedXUser(accessToken);

    if (user.id !== leasedAccount.providerAccountId) {
      throw new Error('Stored X credential does not match the connected account');
    }

    const snapshot = await collectXData(
      leasedAccount.identity,
      leasedAccount._id,
      user,
      accessToken,
    );

    const updateResult = await ExternalAccount.updateOne(
      { _id: leasedAccount._id, provider: 'x', status: 'connected', syncLeaseUntil },
      {
        $set: {
          username: user.username,
          displayName: user.name,
          profileUrl: `https://x.com/${user.username}`,
          avatarUrl: user.profile_image_url ?? null,
          lastSyncedAt: snapshot.collectedAt,
        },
      },
      { runValidators: true },
    );

    if (updateResult.matchedCount === 0) {
      await XDataSnapshot.deleteOne({ _id: snapshot._id });

      return { state: 'disconnected' };
    }

    const reputation = await calculateAndStoreSocialReputation(snapshot);

    if (!reputation) {
      await XDataSnapshot.deleteOne({ _id: snapshot._id });

      return { state: 'disconnected' };
    }

    await ReputationSnapshot.deleteMany({
      identity: leasedAccount.identity,
      category: 'social',
      _id: { $ne: reputation._id },
    });

    await IntegrationSyncJob.updateMany(
      {
        externalAccount: leasedAccount._id,
        provider: 'x',
        resultSnapshot: { $ne: snapshot._id },
      },
      { $set: { resultSnapshot: null } },
    );

    await XDataSnapshot.deleteMany({
      externalAccount: leasedAccount._id,
      _id: { $ne: snapshot._id },
    });

    return { state: 'synchronized', snapshot };
  } finally {
    await ExternalAccount.updateOne(
      { _id: leasedAccount._id, syncLeaseUntil },
      { $set: { syncLeaseUntil: null } },
    );
  }
};

export { resolveXAccessToken, syncXAccount };
