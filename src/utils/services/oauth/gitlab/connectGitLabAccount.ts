import { Types } from 'mongoose';

import Identity from '../../../../models/Identity.js';
import ExternalAccount from '../../../../models/ExternalAccount.js';
import type {
  ConnectedGitLabAccount,
  GitLabOAuthPurpose,
  GitLabUser,
} from '../../../../types/integration/gitlab.js';

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

export { connectGitLabAccount };
