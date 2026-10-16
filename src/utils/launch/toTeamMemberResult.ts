import type { Types } from 'mongoose';

import type {
  TeamMemberProfile,
  LaunchTeamMemberRecord,
  LaunchTeamMemberResult,
} from '../../types/launch/team';

const toTeamMemberResult = (
  member: LaunchTeamMemberRecord & { _id: Types.ObjectId },
  profile?: TeamMemberProfile,
): LaunchTeamMemberResult => ({
  memberId: member._id.toString(),
  kind: member.kind,
  identityId: member.identity?.toString() ?? null,
  name: member.kind === 'external' ? (member.name ?? null) : (profile?.name ?? null),
  avatarUrl: member.kind === 'external' ? (member.avatarUrl ?? null) : (profile?.avatarUrl ?? null),
  xAccount: member.kind === 'external' ? (member.xAccount ?? null) : (profile?.xAccount ?? null),
  role: member.role,
});

export default toTeamMemberResult;
