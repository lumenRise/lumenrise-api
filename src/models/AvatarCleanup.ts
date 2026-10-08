import { Schema, model } from 'mongoose';

import type { AvatarCleanupRecord } from '../types/avatarCleanup';

const schema = new Schema<AvatarCleanupRecord>(
  {
    objectKey: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0, required: true },
    nextAttemptAt: { type: Date, default: Date.now, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { collection: 'avatar_cleanup', versionKey: false },
);

schema.index({ nextAttemptAt: 1 }, { name: 'avatar_cleanup_due' });

const AvatarCleanup = model<AvatarCleanupRecord>('AvatarCleanup', schema);

export default AvatarCleanup;
