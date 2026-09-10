import type { Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount.js';
import { collectGitHubData } from '../reputation/githubData.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import type { GitHubDataSnapshotDocument } from '../../types/reputation/github.js';
import { getProviderCredential, storeProviderCredential } from './providerCredential.js';
import { getAuthenticatedGitHubUser, refreshGitHubAccessToken } from '../oauth/github.js';

const TOKEN_REFRESH_WINDOW_MS = 300_000;
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
): Promise<GitHubDataSnapshotDocument | null> => {
  const accessToken = await resolveGitHubAccessToken(account._id);

  if (!accessToken) {
    return null;
  }

  const user = await getAuthenticatedGitHubUser(accessToken);

  if (user.id.toString() !== account.providerAccountId) {
    throw new Error('Stored GitHub credential does not match the connected account');
  }

  const snapshot = await collectGitHubData(account.identity, account._id, user, accessToken);

  await ExternalAccount.updateOne(
    { _id: account._id, status: 'connected' },
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

  return snapshot;
};

export { needsCredentialRefresh, syncGitHubAccount };
