import log from '../../logger';
import Launch from '../../models/Launch';
import TokenImage from '../../models/TokenImage';
import deleteTokenImageObject from './deleteTokenImageObject';

const processTokenImageCleanup = async (now = new Date()): Promise<void> => {
  const due = await TokenImage.find({
    status: { $in: ['cleanup_ready', 'deleting'] },
    cleanupNextAt: { $lte: now },
  })
    .sort({ cleanupNextAt: 1 })
    .limit(20)
    .lean();

  for (const image of due) {
    const claimed = await TokenImage.findOneAndUpdate(
      {
        _id: image._id,
        status: { $in: ['cleanup_ready', 'deleting'] },
        cleanupNextAt: { $lte: now },
      },
      { $set: { status: 'deleting', cleanupNextAt: new Date(now.getTime() + 15 * 60_000) } },
      { new: true },
    ).lean();
    if (!claimed) {
      continue;
    }

    try {
      const launch = await Launch.findOne({
        network: claimed.network,
        owner: claimed.ownerAddress,
        'metadata.logo': claimed.publicUrl,
      })
        .select('contractId asset')
        .lean();
      if (launch) {
        await TokenImage.updateOne(
          { _id: claimed._id, status: 'deleting' },
          {
            $set: {
              status: 'finalized',
              launchContractId: launch.contractId,
              assetContractId: launch.asset,
              finalizedAt: now,
              cleanupReadyAt: null,
              cleanupNextAt: null,
            },
          },
        );
        continue;
      }

      await deleteTokenImageObject(claimed.objectKey);
      await TokenImage.updateOne(
        { _id: claimed._id, status: 'deleting' },
        {
          $set: { status: 'expired', expiredAt: now, cleanupNextAt: null },
        },
      );
    } catch (error) {
      log.warn({ error, imageId: claimed._id }, 'Token image cleanup will retry');
      const attempts = (claimed.cleanupAttempts ?? 0) + 1;
      const delay = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(attempts, 6));
      await TokenImage.updateOne(
        { _id: claimed._id, status: 'deleting' },
        {
          $set: { cleanupAttempts: attempts, cleanupNextAt: new Date(now.getTime() + delay) },
        },
      );
    }
  }
};

export default processTokenImageCleanup;
