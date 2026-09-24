import { Types } from 'mongoose';

import Identity from '../../../../models/Identity.js';
import ExternalAccount from '../../../../models/ExternalAccount.js';
import type { ConnectedXAccount, XOAuthPurpose, XUser } from '../../../../types/integration/x.js';

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

export { connectXAccount };
