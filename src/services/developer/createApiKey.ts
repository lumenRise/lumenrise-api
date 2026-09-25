import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';

import hashApiKey from '../../utils/developer/hashApiKey.js';
import DeveloperApiKey from '../../models/DeveloperApiKey.js';
import toApiKeyResult from '../../utils/developer/toApiKeyResult.js';
import type { DeveloperApiKeyCreatedResult } from '../../types/developer/api.js';
import { API_KEY_MAX_ACTIVE, API_KEY_TTL_MS } from '../../constants/developer.js';

const createApiKey = async (
  identity: Types.ObjectId,
  label: string,
): Promise<DeveloperApiKeyCreatedResult | null> => {
  const now = new Date();
  const active = await DeveloperApiKey.countDocuments({
    identity,
    revokedAt: null,
    expiresAt: { $gt: now },
  });

  if (active >= API_KEY_MAX_ACTIVE) {
    return null;
  }

  const apiKey = `lrk_${randomBytes(32).toString('base64url')}`;
  const key = await DeveloperApiKey.create({
    identity,
    label,
    tokenHash: hashApiKey(apiKey),
    prefix: apiKey.slice(0, 12),
    expiresAt: new Date(now.getTime() + API_KEY_TTL_MS),
  });

  return { ...toApiKeyResult(key), apiKey };
};

export default createApiKey;
