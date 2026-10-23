import Identity from '../models/Identity';
import type { MigrationDefinition } from '../types/database/migration';

const identityUserIds: MigrationDefinition = {
  name: '20261023-identity-user-ids',
  up: async (): Promise<void> => {
    await Identity.collection.updateMany({}, [
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

    await Identity.createIndexes();

    try {
      await Identity.collection.dropIndex('identities_external_user_unique');
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 27) {
        throw error;
      }
    }

    await Identity.collection.updateMany({}, { $unset: { externalUserId: '' } });
  },
};

export default identityUserIds;
