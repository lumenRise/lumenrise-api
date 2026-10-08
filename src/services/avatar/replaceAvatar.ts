import type { Types } from 'mongoose';

import uploadAvatar from './uploadAvatar';
import processAvatar from './processAvatar';
import Identity from '../../models/Identity';
import deleteAvatarOrQueue from './deleteAvatarOrQueue';
import type { AvatarMutationResult } from '../../types/avatar';

const replaceAvatar = async (
  identityId: Types.ObjectId,
  input: Buffer,
): Promise<AvatarMutationResult | { status: 'invalid' }> => {
  const body = await processAvatar(input);

  if (!body) {
    return { status: 'invalid' };
  }

  const identity = await Identity.findOne({ _id: identityId, status: 'active' })
    .select('+avatarObjectKey name avatarUrl');

  if (!identity) {
    return { status: 'missing' };
  }

  const previousKey = identity.avatarObjectKey ?? null;
  const uploaded = await uploadAvatar(identityId, body);

  let updated;

  try {
    updated = await Identity.findOneAndUpdate(
      { _id: identityId, status: 'active', avatarObjectKey: previousKey },
      { $set: { avatarObjectKey: uploaded.objectKey, avatarUrl: uploaded.publicUrl } },
      { new: true },
    ).select('name avatarUrl');
  } catch (error) {
    await deleteAvatarOrQueue(uploaded.objectKey);
    throw error;
  }

  if (!updated) {
    await deleteAvatarOrQueue(uploaded.objectKey);
    return { status: 'conflict' };
  }

  if (previousKey) {
    await deleteAvatarOrQueue(previousKey);
  }

  return {
    status: 'updated',
    result: { identityId: updated._id.toString(), name: updated.name, avatarUrl: updated.avatarUrl },
  };
};

export default replaceAvatar;
