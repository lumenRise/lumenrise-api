import type { Types } from 'mongoose';

interface LaunchTeamMemberRecord {
  network: 'testnet' | 'public';
  contractId: string;
  kind: 'registered' | 'external';
  identity: Types.ObjectId | null;
  name?: string | null;
  avatarUrl?: string | null;
  avatarObjectKey?: string | null;
  xAccount?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LaunchTeamMemberResult {
  memberId: string;
  kind: 'registered' | 'external';
  identityId: string | null;
  name: string | null;
  avatarUrl: string | null;
  xAccount: string | null;
  role: string;
}

interface TeamMemberProfile {
  name: string | null;
  avatarUrl?: string | null;
  xAccount?: string | null;
}

interface PublicLaunchTeamMemberResult extends Omit<LaunchTeamMemberResult, 'memberId' | 'kind'> {
  memberId: string | null;
  kind: 'owner' | 'registered' | 'external';
  address: string | null;
}

interface TeamMemberUserProfile extends TeamMemberProfile {
  _id: Types.ObjectId;
}

interface ExternalTeamInput {
  name: string;
  role: string;
  xAccount: string;
}

export type {
  PublicLaunchTeamMemberResult,
  ExternalTeamInput,
  TeamMemberProfile,
  TeamMemberUserProfile,
  LaunchTeamMemberRecord,
  LaunchTeamMemberResult,
};
