import { Schema, model } from 'mongoose';

import type { ExternalAccountRecord } from '../types/integration/model.js';
import { EXTERNAL_ACCOUNT_PROVIDERS, EXTERNAL_ACCOUNT_STATUSES } from '../constants/integration.js';

const externalAccountSchema = new Schema<ExternalAccountRecord>(
  {
    identity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    provider: {
      type: String,
      enum: EXTERNAL_ACCOUNT_PROVIDERS,
      required: true,
      immutable: true,
    },
    providerAccountId: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
      maxlength: 255,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    profileUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    status: {
      type: String,
      enum: EXTERNAL_ACCOUNT_STATUSES,
      default: 'connected',
      required: true,
    },
    connectedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    syncLeaseUntil: {
      type: Date,
      default: null,
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

externalAccountSchema.pre('validate', function validateConnectionStatus() {
  const isConnected = this.status === 'connected';
  const hasDisconnectedAt = this.disconnectedAt !== null;

  if (isConnected === hasDisconnectedAt) {
    this.invalidate(
      'disconnectedAt',
      'Disconnected timestamp must be set only for disconnected accounts',
    );
  }
});

externalAccountSchema.index(
  { provider: 1, providerAccountId: 1 },
  { unique: true, name: 'external_accounts_provider_account_unique' },
);
externalAccountSchema.index(
  { identity: 1, provider: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'connected' },
    name: 'external_accounts_one_connected_provider_per_identity',
  },
);
externalAccountSchema.index(
  { identity: 1, status: 1 },
  { name: 'external_accounts_identity_status' },
);

const ExternalAccount = model<ExternalAccountRecord>('ExternalAccount', externalAccountSchema);

export default ExternalAccount;
