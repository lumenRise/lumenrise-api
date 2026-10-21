import LaunchTeamMember from '../../models/LaunchTeamMember';
import applicationRules from '../../constants/applicationRules';
import type { MarketIdentity } from '../../types/launch/market';

const getTeamSlot = async (identity: MarketIdentity): Promise<number | null> => {
  const members = await LaunchTeamMember.find({ ...identity, status: { $ne: 'canceled' } }).lean();
  const maxSlots = applicationRules.team.maxMembers - 1;

  if (members.length >= maxSlots || members.some((member) => !member.slot)) {
    return null;
  }

  for (let slot = 1; slot <= maxSlots; slot += 1) {
    if (!members.some((member) => member.slot === slot)) {
      return slot;
    }
  }

  return null;
};

export default getTeamSlot;
