import { Schema, model } from 'mongoose';

import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress.js';
import type { SorobanTransactionEvidenceRecord } from '../types/stellar/soroban.js';

const eventSchema = new Schema(
  {
    operationIndex: { type: Number, required: true, min: 0 },
    eventIndex: { type: Number, required: true, min: 0 },
    contractId: { type: String, default: null },
    eventXdr: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const sorobanTransactionEvidenceSchema = new Schema<SorobanTransactionEvidenceRecord>(
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
    sourceUrl: { type: String, required: true, immutable: true },
    transactionHash: { type: String, required: true, immutable: true },
    operationIds: { type: [String], required: true },
    initiatedOperation: { type: Boolean, required: true },
    observedAt: { type: Date, required: true, immutable: true },
    rpcStatus: {
      type: String,
      enum: ['queued', 'running', 'success', 'failed', 'not_found', 'unavailable'],
      required: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    scheduledAt: { type: Date, required: true, default: Date.now },
    leaseUntil: { type: Date, default: null },
    ledger: { type: Number, default: null },
    envelopeXdr: { type: String, default: null },
    resultMetaXdr: { type: String, default: null },
    returnValueXdr: { type: String, default: null },
    events: { type: [eventSchema], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

sorobanTransactionEvidenceSchema.index(
  { scan: 1, transactionHash: 1 },
  { unique: true, name: 'soroban_evidence_scan_transaction_unique' },
);

sorobanTransactionEvidenceSchema.index(
  { scan: 1, _id: -1 },
  { name: 'soroban_evidence_scan_page' },
);

sorobanTransactionEvidenceSchema.index(
  { rpcStatus: 1, scheduledAt: 1, leaseUntil: 1 },
  { name: 'soroban_evidence_worker_claim' },
);

const SorobanTransactionEvidence = model<SorobanTransactionEvidenceRecord>(
  'SorobanTransactionEvidence',
  sorobanTransactionEvidenceSchema,
);

export default SorobanTransactionEvidence;
