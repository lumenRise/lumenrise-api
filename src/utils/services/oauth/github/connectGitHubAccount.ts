import { Types } from 'mongoose';

import Identity from '../../../../models/Identity.js';
import ExternalAccount from '../../../../models/ExternalAccount.js';
import type {
  ConnectedGitHubAccount,
  GitHubOAuthPurpose,
  GitHubUser,
} from '../../../../types/integration/github.js';

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
    throw new Error('GitHub account connection could not be persisted');
  }

  return { identityId, externalAccount };
};

export { connectGitHubAccount };
