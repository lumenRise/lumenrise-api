import { Schema, model } from 'mongoose';

import type { ManualRefreshCooldownRecord } from '../types/refresh/cooldown.js';

const manualRefreshCooldownSchema = new Schema<ManualRefreshCooldownRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    target: { type: String, required: true, immutable: true },
    nextAllowedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

manualRefreshCooldownSchema.index(
  { identity: 1, target: 1 },
  { unique: true, name: 'manual_refresh_identity_target_unique' },
);

const ManualRefreshCooldown = model<ManualRefreshCooldownRecord>(
  'ManualRefreshCooldown',
  manualRefreshCooldownSchema,
);

export default ManualRefreshCooldown;
