import { Types } from 'mongoose';
import { expect, it, vi } from 'vitest';

import Identity from '../src/models/Identity';
import updateProfileName from '../src/services/avatar/updateProfileName';

const verifyProfileNameUpdate = async (): Promise<void> => {
  const identityId = new Types.ObjectId();
  const avatarUrl = 'https://images.example/current.webp';
  const select = vi.fn().mockResolvedValue({ _id: identityId, name: 'Alex', avatarUrl });

  const update = vi.spyOn(Identity, 'findOneAndUpdate').mockReturnValue({ select } as never);

  try {
    const result = await updateProfileName(identityId, 'Alex');

    expect(update).toHaveBeenCalledExactlyOnceWith(
      { _id: identityId, status: 'active' },
      { $set: { name: 'Alex' } },
      { new: true, runValidators: true },
    );

    expect(result).toEqual({
      status: 'updated',
      result: { identityId: identityId.toString(), name: 'Alex', avatarUrl },
    });

    select.mockResolvedValue(null);

    await expect(updateProfileName(identityId, 'Alex')).resolves.toEqual({ status: 'missing' });
  } finally {
    update.mockRestore();
  }
};

it('updates only the active identity name and preserves the avatar', verifyProfileNameUpdate);
