import ExternalAccount from '../../models/ExternalAccount';
import type { TeamMemberProfile, TeamMemberUserProfile } from '../../types/launch/team';

const getTeamProfiles = async (
  users: TeamMemberUserProfile[],
): Promise<Map<string, TeamMemberProfile>> => {
  if (!users.length) {
    return new Map();
  }

  const accounts = await ExternalAccount.find({
    identity: { $in: users.map((user) => user._id) },
    provider: 'x',
    status: 'connected',
    disconnectedAt: null,
  }).select('identity profileUrl username').lean();

  const links = new Map(accounts.map((account) => [
    account.identity.toString(),
    account.profileUrl ?? `https://x.com/${encodeURIComponent(account.username)}`,
  ]));

  return new Map(users.map((user) => [user._id.toString(), {
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    xAccount: links.get(user._id.toString()) ?? null,
  }]));
};

export default getTeamProfiles;
