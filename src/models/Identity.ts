import { Schema, model } from 'mongoose';

import { IDENTITY_STATUSES } from '../constants/identity.js';
import type { IdentityRecord } from '../types/identity/model.js';

const identitySchema = new Schema<IdentityRecord>(
  {
    status: {
      type: String,
      enum: IDENTITY_STATUSES,
      default: 'active',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

identitySchema.index({ status: 1, _id: 1 }, { name: 'identities_status_id' });

const Identity = model<IdentityRecord>('Identity', identitySchema);

export default Identity;
