import { Schema, model } from 'mongoose';

import type { StellarAccountRecord } from '../types/identity/model.js';
import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress.js';

const stellarAccountSchema = new Schema<StellarAccountRecord>(
  {
    identity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
      validate: {
        validator: isValidStellarGAddress,
        message: 'Invalid Stellar account address',
      },
    },
    isPrimary: {
      type: Boolean,
      default: false,
      required: true,
    },
    connectedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    disconnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

stellarAccountSchema.index(
  { address: 1 },
  { unique: true, name: 'stellar_accounts_address_unique' },
);
stellarAccountSchema.index(
  { identity: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true, disconnectedAt: null },
    name: 'stellar_accounts_one_primary_per_identity',
  },
);
stellarAccountSchema.index(
  { identity: 1, disconnectedAt: 1 },
  { name: 'stellar_accounts_identity_connected' },
);

const StellarAccount = model<StellarAccountRecord>('StellarAccount', stellarAccountSchema);

export default StellarAccount;
