import { Schema, model } from 'mongoose';

import type { StellarPaymentFactRecord } from '../types/sybil/network.js';
import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress.js';

const stellarPaymentFactSchema = new Schema<StellarPaymentFactRecord>(
  {
    scan: {
      type: Schema.Types.ObjectId,
      ref: 'StellarActivityScan',
      required: true,
      immutable: true,
    },
    requestedByIdentity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    address: { type: String, required: true, immutable: true, validate: isValidStellarGAddress },
    counterparty: {
      type: String,
      required: true,
      immutable: true,
      validate: isValidStellarGAddress,
    },
    sourceUrl: { type: String, required: true, immutable: true },
    operationId: { type: String, required: true, immutable: true },
    transactionHash: { type: String, required: true, immutable: true },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true, immutable: true },
    observedAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

stellarPaymentFactSchema.index(
  { scan: 1, operationId: 1 },
  { unique: true, name: 'stellar_payment_facts_scan_operation_unique' },
);
stellarPaymentFactSchema.index(
  { address: 1, counterparty: 1, observedAt: -1 },
  { name: 'stellar_payment_facts_address_counterparty_observed' },
);

const StellarPaymentFact = model<StellarPaymentFactRecord>(
  'StellarPaymentFact',
  stellarPaymentFactSchema,
);

export default StellarPaymentFact;
