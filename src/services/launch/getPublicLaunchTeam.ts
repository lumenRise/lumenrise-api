import Identity from '../../models/Identity';
import getTeamProfiles from './getTeamProfiles';
import StellarAccount from '../../models/StellarAccount';
import LaunchTeamMember from '../../models/LaunchTeamMember';
import type { LaunchRecord } from '../../types/launch/model';
import toTeamMemberResult from '../../utils/launch/toTeamMemberResult';
import type { PublicLaunchTeamMemberResult } from '../../types/launch/team';

const getPublicLaunchTeam = async (
  launch: LaunchRecord,
): Promise<PublicLaunchTeamMemberResult[]> => {
  const members = await LaunchTeamMember.find({
    network: launch.network,
    contractId: launch.contractId,
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const ownerAccount = await StellarAccount.findOne({
    address: launch.owner,
    disconnectedAt: null,
  })
    .select('identity')
    .lean();

  const identityIds = members
    .filter((member) => member.kind !== 'external')
    .map((member) => member.identity);

  if (ownerAccount) {
    identityIds.push(ownerAccount.identity);
  }

  const users = await Identity.find({
    _id: { $in: identityIds },
    status: 'active',
    deletedAt: null,
    'externalUserIds.0': { $exists: true },
  })
    .select('name avatarUrl')
    .lean();

  const profiles = await getTeamProfiles(users);
  const ownerId = ownerAccount?.identity.toString();
  const ownerProfile = ownerId ? profiles.get(ownerId) : undefined;

  const owner: PublicLaunchTeamMemberResult = {
    memberId: null,
    kind: 'owner',
    identityId: ownerProfile ? (ownerId ?? null) : null,
    address: launch.owner,
    name: ownerProfile?.name ?? null,
    avatarUrl: ownerProfile?.avatarUrl ?? null,
    xAccount: ownerProfile?.xAccount ?? null,
    role: 'owner',
    status: 'active',
  };

  return [
    owner,
    ...members
      .filter(
        (member) =>
          (member.status === 'active' || (member.kind === 'external' && !member.status)) &&
          (member.kind === 'external' ||
            (member.identity &&
              member.identity.toString() !== ownerId &&
              profiles.has(member.identity.toString()))),
      )
      .map((member) => ({
        ...toTeamMemberResult(
          member,
          member.identity ? profiles.get(member.identity.toString()) : undefined,
        ),
        address: null,
      })),
  ];
};

export default getPublicLaunchTeam;
