import { Schema, model } from 'mongoose';

import type { TokenImageRecord } from '../types/tokenImage';

const schema = new Schema<TokenImageRecord>(
  {
    ownerIdentityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    ownerAddress: { type: String, required: true, immutable: true },
    network: { type: String, enum: ['testnet', 'public'], required: true, immutable: true },
    objectKey: { type: String, required: true, unique: true, immutable: true },
    publicUrl: { type: String, required: true, unique: true, immutable: true },
    status: { type: String, enum: ['pending', 'finalized'], required: true, default: 'pending' },
    launchContractId: { type: String, default: null },
    assetContractId: { type: String, default: null },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    finalizedAt: { type: Date, default: null },
  },
  { collection: 'token_images', versionKey: false },
);

schema.index({ network: 1, publicUrl: 1, ownerAddress: 1 }, { name: 'token_images_launch_match' });
schema.index({ network: 1, assetContractId: 1 }, { name: 'token_images_asset' });
schema.index({ ownerIdentityId: 1, createdAt: -1 }, { name: 'token_images_owner' });

const TokenImage = model<TokenImageRecord>('TokenImage', schema);

export default TokenImage;
