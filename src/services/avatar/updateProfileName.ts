import type { Types } from 'mongoose';

import Identity from '../../models/Identity';
import type { AvatarMutationResult } from '../../types/avatar';

const updateProfileName = async (
  identityId: Types.ObjectId,
  name: string,
): Promise<AvatarMutationResult> => {
  const identity = await Identity.findOneAndUpdate(
    { _id: identityId, status: 'active' },
    { $set: { name } },
    { new: true, runValidators: true },
  ).select('name avatarUrl');

  if (!identity) {
    return { status: 'missing' };
  }

  return {
    status: 'updated',
    result: {
      identityId: identity._id.toString(),
      name: identity.name,
      avatarUrl: identity.avatarUrl ?? null,
    },
  };
};

export default updateProfileName;
