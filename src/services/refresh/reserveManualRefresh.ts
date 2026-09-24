import type { Types } from 'mongoose';

import { MANUAL_REFRESH_INTERVAL_MS } from '../../constants/refresh.js';
import ManualRefreshCooldown from '../../models/ManualRefreshCooldown.js';
import type { ManualRefreshReservation } from '../../types/refresh/cooldown.js';

const reserveManualRefresh = async (
  identity: Types.ObjectId,
  target: string,
  now = new Date(),
): Promise<ManualRefreshReservation> => {
  const nextAllowedAt = new Date(now.getTime() + MANUAL_REFRESH_INTERVAL_MS);

  try {
    const cooldown = await ManualRefreshCooldown.findOneAndUpdate(
      {
        identity,
        target,
        $or: [{ nextAllowedAt: { $lte: now } }, { nextAllowedAt: { $exists: false } }],
      },
      {
        $set: { nextAllowedAt },
        $setOnInsert: { identity, target },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );

    if (cooldown) {
      return { allowed: true, retryAt: null, reservedUntil: nextAllowedAt };
    }
  } catch (error) {
    if (typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 11_000) {
      throw error;
    }
  }

  const cooldown = await ManualRefreshCooldown.findOne({ identity, target });

  return {
    allowed: false,
    retryAt: cooldown?.nextAllowedAt ?? nextAllowedAt,
    reservedUntil: null,
  };
};

export default reserveManualRefresh;
