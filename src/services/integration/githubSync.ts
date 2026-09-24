import ExternalAccount from '../../models/ExternalAccount.js';
import { collectGitHubData } from '../reputation/githubData.js';
import { getAuthenticatedGitHubUser } from '../oauth/github.js';
import type { GitHubSyncOutcome } from '../../types/integration/sync.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import { calculateAndStoreDeveloperReputation } from '../reputation/developerScore.js';
import { TOKEN_REFRESH_WINDOW_MS } from '../../constants/services/integration/githubSync.js';
import { GITHUB_SYNC_LEASE_MS, GITHUB_SYNC_MIN_INTERVAL_MS } from '../../constants/integration.js';
import { getRetryAfterSeconds } from '../../utils/services/integration/githubSync/getRetryAfterSeconds.js';
import { needsCredentialRefresh } from '../../utils/services/integration/githubSync/needsCredentialRefresh.js';
import { resolveGitHubAccessToken } from '../../utils/services/integration/githubSync/resolveGitHubAccessToken.js';

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

    await calculateAndStoreDeveloperReputation(leasedAccount.identity);

    return { state: 'synchronized', snapshot };
  } finally {
    await ExternalAccount.updateOne(
      { _id: leasedAccount._id, syncLeaseUntil },
      { $set: { syncLeaseUntil: null } },
    );
  }
};

export { getRetryAfterSeconds, needsCredentialRefresh, syncGitHubAccount };

export { TOKEN_REFRESH_WINDOW_MS };
