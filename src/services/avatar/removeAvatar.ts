import type { Types } from 'mongoose';

import Identity from '../../models/Identity';
import deleteAvatarOrQueue from './deleteAvatarOrQueue';
import type { AvatarMutationResult } from '../../types/avatar';

const removeAvatar = async (identityId: Types.ObjectId): Promise<AvatarMutationResult> => {
  const identity = await Identity.findOne({ _id: identityId, status: 'active' }).select(
    '+avatarObjectKey name avatarUrl',
  );

  if (!identity) {
    return { status: 'missing' };
  }

  const previousKey = identity.avatarObjectKey ?? null;

  if (!previousKey && !identity.avatarUrl) {
    return {
      status: 'updated',
      result: { identityId: identity._id.toString(), name: identity.name, avatarUrl: null },
    };
  }

  const updated = await Identity.findOneAndUpdate(
    { _id: identityId, status: 'active', avatarObjectKey: previousKey },
    { $set: { avatarObjectKey: null, avatarUrl: null } },
    { new: true },
  ).select('name avatarUrl');

  if (!updated) {
    return { status: 'conflict' };
  }

  if (previousKey) {
    await deleteAvatarOrQueue(previousKey);
  }

  return {
    status: 'updated',
    result: { identityId: updated._id.toString(), name: updated.name, avatarUrl: null },
  };
};

export default removeAvatar;
