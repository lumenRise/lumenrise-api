import log from '../../logger';
import deleteAvatarObject from './deleteAvatarObject';
import AvatarCleanup from '../../models/AvatarCleanup';

const processAvatarCleanup = async (): Promise<void> => {
  const due = await AvatarCleanup.find({ nextAttemptAt: { $lte: new Date() } })
    .limit(20)
    .lean();

  for (const item of due) {
    try {
      await deleteAvatarObject(item.objectKey);

      await AvatarCleanup.deleteOne({ objectKey: item.objectKey });
    } catch (error) {
      log.warn({ error, objectKey: item.objectKey }, 'Avatar cleanup retry failed');

      const attempts = item.attempts + 1;
      const delay = Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.min(attempts, 6));

      await AvatarCleanup.updateOne(
        { objectKey: item.objectKey },
        { $set: { attempts, nextAttemptAt: new Date(Date.now() + delay) } },
      );
    }
  }
};

export default processAvatarCleanup;
