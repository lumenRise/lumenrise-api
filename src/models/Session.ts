import { Schema, model } from 'mongoose';

import type { SessionRecord } from '../types/auth/model.js';

const sessionSchema = new Schema<SessionRecord>(
  {
    identity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    tokenHash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      match: [/^[a-f0-9]{64}$/, 'Session token hash must be a SHA-256 hex value'],
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    lastSeenAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true, name: 'sessions_token_hash_unique' });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' });
sessionSchema.index(
  { identity: 1, revokedAt: 1, expiresAt: 1 },
  { name: 'sessions_identity_active' },
);

const Session = model<SessionRecord>('Session', sessionSchema);

export default Session;
