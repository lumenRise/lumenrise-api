import { beforeEach, describe, expect, it, vi } from 'vitest';

import Identity from '../../src/models/Identity';
import identityUserIds from '../../src/migrations/20261023IdentityUserIds';

vi.mock('../../src/models/Identity', () => ({
  default: {
    collection: { updateMany: vi.fn(), dropIndex: vi.fn() },
    createIndexes: vi.fn(),
  },
}));

describe('identity user ID migration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('unions legacy IDs with existing aliases before replacing the old index and field', async () => {
    await identityUserIds.up();

    expect(Identity.collection.updateMany).toHaveBeenNthCalledWith(1, {}, [
      {
        $set: {
          externalUserIds: {
            $setUnion: [
              { $ifNull: ['$externalUserIds', []] },
              {
                $cond: [{ $eq: [{ $type: '$externalUserId' }, 'string'] }, ['$externalUserId'], []],
              },
            ],
          },
        },
      },
    ]);
    expect(Identity.createIndexes).toHaveBeenCalledOnce();
    expect(Identity.collection.dropIndex).toHaveBeenCalledWith('identities_external_user_unique');
    expect(Identity.collection.updateMany).toHaveBeenLastCalledWith(
      {},
      { $unset: { externalUserId: '' } },
    );
    expect(vi.mocked(Identity.createIndexes).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(Identity.collection.dropIndex).mock.invocationCallOrder[0]!,
    );
  });

  it('can resume after the legacy index was already removed', async () => {
    vi.mocked(Identity.collection.dropIndex).mockRejectedValue({ code: 27 });

    await expect(identityUserIds.up()).resolves.toBeUndefined();
    expect(Identity.collection.updateMany).toHaveBeenCalledTimes(2);
  });

  it('does not remove legacy data when creating the unique index fails', async () => {
    vi.mocked(Identity.createIndexes).mockRejectedValue(new Error('Duplicate user ID'));

    await expect(identityUserIds.up()).rejects.toThrow('Duplicate user ID');
    expect(Identity.collection.dropIndex).not.toHaveBeenCalled();
    expect(Identity.collection.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not ignore database errors while removing the old index', async () => {
    vi.mocked(Identity.collection.dropIndex).mockRejectedValue({ code: 13 });

    await expect(identityUserIds.up()).rejects.toEqual({ code: 13 });
    expect(Identity.collection.updateMany).toHaveBeenCalledTimes(1);
  });
});
