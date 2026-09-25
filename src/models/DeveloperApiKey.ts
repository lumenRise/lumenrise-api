import { Schema, model } from 'mongoose';

import type { DeveloperApiKeyRecord } from '../types/developer/api.js';

const developerApiKeySchema = new Schema<DeveloperApiKeyRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    tokenHash: { type: String, required: true, immutable: true, select: false },
    prefix: { type: String, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

developerApiKeySchema.index(
  { tokenHash: 1 },
  { unique: true, name: 'developer_api_keys_token_hash_unique' },
);
developerApiKeySchema.index(
  { identity: 1, createdAt: -1 },
  { name: 'developer_api_keys_identity_created' },
);

const DeveloperApiKey = model<DeveloperApiKeyRecord>('DeveloperApiKey', developerApiKeySchema);

export default DeveloperApiKey;
