import { Schema, model } from 'mongoose';

import type { OAuthStateRecord } from '../types/integration/model.js';
import { EXTERNAL_ACCOUNT_PROVIDERS, OAUTH_PURPOSES } from '../constants/integration.js';

const oauthStateSchema = new Schema<OAuthStateRecord>(
  {
    identity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      default: null,
      immutable: true,
    },
    provider: {
      type: String,
      enum: EXTERNAL_ACCOUNT_PROVIDERS,
      required: true,
      immutable: true,
    },
    purpose: {
      type: String,
      enum: OAUTH_PURPOSES,
      required: true,
      immutable: true,
    },
    stateHash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      match: [/^[a-f0-9]{64}$/, 'OAuth state hash must be a SHA-256 hex value'],
    },
    codeChallenge: {
      type: String,
      required: true,
      immutable: true,
      match: [/^[A-Za-z0-9_-]{43}$/, 'PKCE code challenge must be a SHA-256 base64url value'],
    },
    codeVerifier: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      match: [/^[A-Za-z0-9_-]{43}$/, 'PKCE code verifier must be a base64url value'],
    },
    redirectUri: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 2_048,
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

oauthStateSchema.pre('validate', function validatePurposeIdentity() {
  if (this.purpose === 'connect' && this.identity === null) {
    this.invalidate('identity', 'Identity is required when connecting another account');
  }
});

oauthStateSchema.index({ stateHash: 1 }, { unique: true, name: 'oauth_states_state_hash_unique' });
oauthStateSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'oauth_states_expiry_ttl' },
);

const OAuthState = model<OAuthStateRecord>('OAuthState', oauthStateSchema);

export default OAuthState;
