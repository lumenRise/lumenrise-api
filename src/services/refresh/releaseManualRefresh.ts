import type { Types } from 'mongoose';

import ManualRefreshCooldown from '../../models/ManualRefreshCooldown.js';

const releaseManualRefresh = async (
  identity: Types.ObjectId,
  target: string,
  reservedUntil: Date,
): Promise<void> => {
  await ManualRefreshCooldown.deleteOne({ identity, target, nextAllowedAt: reservedUntil });
};

export default releaseManualRefresh;
