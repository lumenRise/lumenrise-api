import type { Types } from 'mongoose';

import DeveloperApiUsage from '../../models/DeveloperApiUsage.js';
import { API_KEY_WINDOW_MS, API_KEY_WINDOW_LIMIT } from '../../constants/developer.js';

const reserveApiUsage = async (identity: Types.ObjectId, now = new Date()): Promise<boolean> => {
  const windowStart = new Date(Math.floor(now.getTime() / API_KEY_WINDOW_MS) * API_KEY_WINDOW_MS);

  try {
    const usage = await DeveloperApiUsage.findOneAndUpdate(
      { identity, windowStart, count: { $lt: API_KEY_WINDOW_LIMIT } },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          identity,
          windowStart,
          expiresAt: new Date(windowStart.getTime() + 2 * API_KEY_WINDOW_MS),
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );

    return usage !== null;
  } catch (error) {
    if (typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 11_000) {
      throw error;
    }

    const usage = await DeveloperApiUsage.findOneAndUpdate(
      { identity, windowStart, count: { $lt: API_KEY_WINDOW_LIMIT } },
      { $inc: { count: 1 } },
      { returnDocument: 'after', runValidators: true },
    );

    return usage !== null;
  }
};

export default reserveApiUsage;
