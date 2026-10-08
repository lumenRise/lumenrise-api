import log from '../../logger';
import deleteAvatarObject from './deleteAvatarObject';
import AvatarCleanup from '../../models/AvatarCleanup';

const deleteAvatarOrQueue = async (objectKey: string): Promise<void> => {
  try {
    await deleteAvatarObject(objectKey);
  } catch (error) {
    log.warn({ error, objectKey }, 'Avatar deletion will be retried');

    try {
      await AvatarCleanup.updateOne(
        { objectKey },
        {
          $setOnInsert: {
            objectKey,
            attempts: 0,
            nextAttemptAt: new Date(),
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (queueError) {
      log.error({ error: queueError, objectKey }, 'Avatar cleanup could not be queued');
    }
  }
};

export default deleteAvatarOrQueue;
