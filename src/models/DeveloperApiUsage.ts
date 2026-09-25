import { Schema, model } from 'mongoose';

import type { DeveloperApiUsageRecord } from '../types/developer/api.js';

const developerApiUsageSchema = new Schema<DeveloperApiUsageRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    windowStart: { type: Date, required: true, immutable: true },
    count: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true, immutable: true },
  },
  { versionKey: false },
);

developerApiUsageSchema.index(
  { identity: 1, windowStart: 1 },
  { unique: true, name: 'developer_api_usage_identity_window_unique' },
);
developerApiUsageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'developer_api_usage_expiry' },
);

const DeveloperApiUsage = model<DeveloperApiUsageRecord>(
  'DeveloperApiUsage',
  developerApiUsageSchema,
);

export default DeveloperApiUsage;
