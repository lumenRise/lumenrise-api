import { Schema, model } from 'mongoose';

import type { TokenImageRecord } from '../types/tokenImage';

const schema = new Schema<TokenImageRecord>(
  {
    chain: {
      type: String,
      enum: ['stellar', 'base'],
      required: true,
      default: 'stellar',
      immutable: true,
    },
    ownerIdentityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    ownerAddress: { type: String, required: true, immutable: true },
    network: { type: String, enum: ['testnet', 'public'], required: true, immutable: true },
    objectKey: { type: String, required: true, unique: true, immutable: true },
    slug: { type: String, immutable: true },
    projectName: { type: String, immutable: true },
    description: { type: String, immutable: true },
    website: { type: String },
    xAccount: { type: String },
    publicUrl: { type: String, required: true, unique: true, immutable: true },
    status: {
      type: String,
      enum: ['pending', 'cleanup_ready', 'deleting', 'finalized', 'expired'],
      required: true,
      default: 'pending',
    },
    launchContractId: { type: String, default: null },
    assetContractId: { type: String, default: null },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    finalizedAt: { type: Date, default: null },
    cleanupReadyAt: { type: Date, default: null },
    cleanupNextAt: { type: Date, default: null },
    cleanupAttempts: { type: Number, default: 0 },
    expiredAt: { type: Date, default: null },
  },
  { collection: 'token_images', versionKey: false },
);

schema.index(
  { chain: 1, network: 1, publicUrl: 1, ownerAddress: 1 },
  { name: 'token_images_launch_match_chain' },
);

schema.index({ ownerIdentityId: 1, createdAt: -1 }, { name: 'token_images_owner' });

schema.index({ status: 1, cleanupNextAt: 1 }, { name: 'token_images_cleanup_due' });

schema.index(
  { chain: 1, network: 1, status: 1, createdAt: 1 },
  { name: 'token_images_pending_age_chain' },
);

schema.index(
  { chain: 1, network: 1, assetContractId: 1 },
  {
    unique: true,
    partialFilterExpression: { assetContractId: { $type: 'string' } },
    name: 'token_images_asset_unique_chain',
  },
);

schema.index(
  { chain: 1, network: 1, launchContractId: 1 },
  {
    unique: true,
    partialFilterExpression: { launchContractId: { $type: 'string' } },
    name: 'token_images_launch_unique_chain',
  },
);

const TokenImage = model<TokenImageRecord>('TokenImage', schema);

export default TokenImage;
