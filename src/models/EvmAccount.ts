import { Schema, model } from 'mongoose';

import isBaseAddress from '../utils/base/isBaseAddress';
import type { EvmAccountRecord } from '../types/auth/privy';

const schema = new Schema<EvmAccountRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    address: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      validate: isBaseAddress,
    },
    isPrimary: { type: Boolean, required: true, default: false },
    connectedAt: { type: Date, required: true, immutable: true },
    disconnectedAt: { type: Date, default: null },
  },
  { collection: 'evm_accounts', timestamps: true, versionKey: false },
);

schema.index({ address: 1 }, { unique: true, name: 'evm_accounts_address_unique' });

schema.index(
  { identity: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true, disconnectedAt: null },
    name: 'evm_accounts_primary_unique',
  },
);

schema.index({ identity: 1, disconnectedAt: 1 }, { name: 'evm_accounts_connected' });

const EvmAccount = model<EvmAccountRecord>('EvmAccount', schema);

export default EvmAccount;
