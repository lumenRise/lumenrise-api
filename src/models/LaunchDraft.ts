import { Schema, model } from 'mongoose';

import type { LaunchDraftRecord } from '../types/launch/draft';

const schema = new Schema<LaunchDraftRecord>(
  {
    schemaVersion: { type: Number, required: true, default: 1, immutable: true },
    ownerIdentityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    ownerAddress: { type: String, required: true, immutable: true },
    network: { type: String, enum: ['testnet', 'public'], required: true, immutable: true },
    method: { type: String, enum: ['bonding'], required: true, immutable: true },
    status: {
      type: String,
      enum: ['editing', 'submitted', 'confirmed', 'unmatched', 'failed'],
      required: true,
      default: 'editing',
    },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
    imageId: { type: Schema.Types.ObjectId, default: null },
    params: { type: Schema.Types.Mixed, default: null },
    assetContractId: { type: String, default: null },
    transactionHash: { type: String, default: null },
    verifiedContractId: { type: String, default: null },
    launchContractId: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    nextMatchAt: { type: Date, default: null },
    matchAttempts: { type: Number, default: 0 },
  },
  { collection: 'launch_drafts', versionKey: false, timestamps: true },
);

schema.index({ ownerIdentityId: 1, updatedAt: -1 }, { name: 'launch_drafts_owner' });
schema.index(
  { network: 1, ownerAddress: 1, assetContractId: 1, status: 1 },
  { name: 'launch_drafts_match' },
);
schema.index({ network: 1, status: 1, nextMatchAt: 1 }, { name: 'launch_drafts_match_due' });
schema.index(
  { network: 1, transactionHash: 1 },
  {
    unique: true,
    name: 'launch_drafts_transaction_unique',
    partialFilterExpression: { transactionHash: { $type: 'string' } },
  },
);
schema.index(
  { network: 1, launchContractId: 1 },
  {
    unique: true,
    name: 'launch_drafts_launch_unique',
    partialFilterExpression: { launchContractId: { $type: 'string' } },
  },
);
schema.index(
  { imageId: 1 },
  {
    unique: true,
    name: 'launch_drafts_image_unique',
    partialFilterExpression: { imageId: { $type: 'objectId' } },
  },
);

const LaunchDraft = model<LaunchDraftRecord>('LaunchDraft', schema);

export default LaunchDraft;
