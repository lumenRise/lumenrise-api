import { Schema, model } from 'mongoose';

import type { PolicyRecord, PolicyRule } from '../types/policy/model.js';
import { POLICY_DIMENSIONS, POLICY_MATCHES, POLICY_MAX_AGE_SECONDS } from '../constants/policy.js';

const policyRuleSchema = new Schema<PolicyRule>(
  {
    dimension: { type: String, enum: POLICY_DIMENSIONS, required: true, immutable: true },
    minScore: { type: Number, min: 0, max: 100, required: true, immutable: true },
    maxAgeSeconds: {
      type: Number,
      min: 60,
      max: POLICY_MAX_AGE_SECONDS,
      required: true,
      immutable: true,
      validate: { validator: Number.isInteger, message: 'maxAgeSeconds must be an integer' },
    },
  },
  { _id: false, versionKey: false },
);

const policySchema = new Schema<PolicyRecord>(
  {
    ownerIdentity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    key: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z][a-z0-9-]{2,63}$/, 'Invalid policy key'],
    },
    version: {
      type: Number,
      min: 1,
      required: true,
      immutable: true,
      validate: { validator: Number.isInteger, message: 'Policy version must be an integer' },
    },
    match: { type: String, enum: POLICY_MATCHES, required: true, immutable: true },
    rules: { type: [policyRuleSchema], required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

policySchema.pre('validate', function validatePolicyRules() {
  if (this.rules.length < 1 || this.rules.length > POLICY_DIMENSIONS.length) {
    this.invalidate('rules', 'Policies require one to three rules');
  }

  if (new Set(this.rules.map((rule) => rule.dimension)).size !== this.rules.length) {
    this.invalidate('rules', 'A dimension may appear only once in a policy');
  }
});

policySchema.index(
  { ownerIdentity: 1, key: 1, version: 1 },
  { unique: true, name: 'policies_owner_key_version_unique' },
);

const Policy = model<PolicyRecord>('Policy', policySchema);

export default Policy;
