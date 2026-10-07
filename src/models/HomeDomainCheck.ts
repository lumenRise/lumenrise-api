import { Schema, model } from 'mongoose';

import type { HomeDomainVerificationRecord } from '../types/homeDomain/verification';

const schema = new Schema<HomeDomainVerificationRecord>(
  {
    network: { type: String, enum: ['testnet', 'public'], required: true },
    issuer: { type: String, required: true },
    claimedDomain: { type: String, default: null },
    tomlUrl: { type: String, default: null },
    status: { type: String, enum: ['verified', 'pending', 'mismatch', 'unavailable'], required: true },
    reason: { type: String, default: null },
    checkedAt: { type: Date, required: true },
    accountLedger: { type: Number, default: null },
    publishedAssets: { type: [String], default: [] },
  },
  { collection: 'home_domain_checks', versionKey: false },
);

schema.index({ network: 1, issuer: 1, checkedAt: -1 }, { name: 'home_domain_check_history' });

const HomeDomainCheck = model<HomeDomainVerificationRecord>('HomeDomainCheck', schema);

export default HomeDomainCheck;
