import { Schema, model } from 'mongoose';

import type { PrivyIdentityRecord } from '../types/auth/privy';

const schema = new Schema<PrivyIdentityRecord>(
  {
    userId: { type: String, required: true, immutable: true },
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
  },
  { collection: 'privy_identities', timestamps: true, versionKey: false },
);

schema.index({ userId: 1 }, { unique: true, name: 'privy_identities_user_unique' });

schema.index({ identity: 1 }, { name: 'privy_identities_identity' });

const PrivyIdentity = model<PrivyIdentityRecord>('PrivyIdentity', schema);

export default PrivyIdentity;
