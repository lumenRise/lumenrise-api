import { Schema, model } from 'mongoose';

import applicationRules from '../constants/applicationRules';
import type { LaunchTeamMemberRecord } from '../types/launch/team';

const schema = new Schema<LaunchTeamMemberRecord>(
  {
    network: { type: String, enum: ['testnet', 'public'], required: true, immutable: true },
    contractId: { type: String, required: true, immutable: true },
    kind: {
      type: String,
      enum: ['registered', 'external'],
      default: 'registered',
      required: true,
      immutable: true,
    },
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', default: null, immutable: true },
    name: { type: String, trim: true, maxlength: applicationRules.team.nameMaxLength },
    avatarUrl: { type: String },
    avatarObjectKey: { type: String, select: false },
    xAccount: { type: String, maxlength: applicationRules.projectLinks.maxLength },
    status: { type: String, enum: ['active', 'pending', 'canceled'], required: true },
    slot: { type: Number, min: 1, max: applicationRules.team.maxMembers - 1 },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: applicationRules.team.roleMaxLength,
    },
  },
  { collection: 'launch_team_members', timestamps: true, versionKey: false },
);

schema.index(
  { network: 1, contractId: 1, identity: 1 },
  {
    unique: true,
    partialFilterExpression: { identity: { $type: 'objectId' } },
    name: 'launch_team_member_unique',
  },
);

schema.index(
  { network: 1, contractId: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { slot: { $type: 'number' } },
    name: 'launch_team_slot_unique',
  },
);

schema.index({ identity: 1, network: 1, status: 1 }, { name: 'launch_team_invitations' });

const LaunchTeamMember = model<LaunchTeamMemberRecord>('LaunchTeamMember', schema);

export default LaunchTeamMember;
