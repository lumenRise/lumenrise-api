import { Schema, model } from 'mongoose';

import type { WalletAuthChallengeRecord } from '../types/auth/wallet.js';
import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress.js';

const walletAuthChallengeSchema = new Schema<WalletAuthChallengeRecord>(
  {
    address: {
      type: String,
      required: true,
      uppercase: true,
      immutable: true,
      validate: { validator: isValidStellarGAddress, message: 'Invalid Stellar address' },
    },
    purpose: { type: String, enum: ['register', 'login'], required: true, immutable: true },
    nameHash: {
      type: String,
      default: null,
      immutable: true,
      match: /^[a-f0-9]{64}$/,
    },
    messageHash: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f0-9]{64}$/,
    },
    expiresAt: { type: Date, required: true, immutable: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

walletAuthChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'wallet_auth_challenges_expiry' },
);

walletAuthChallengeSchema.index(
  { address: 1, purpose: 1, createdAt: -1 },
  { name: 'wallet_auth_challenges_address_purpose' },
);

const WalletAuthChallenge = model<WalletAuthChallengeRecord>(
  'WalletAuthChallenge',
  walletAuthChallengeSchema,
);

export default WalletAuthChallenge;
