import LaunchTeamMember from '../models/LaunchTeamMember';
import type { MarketIdentity } from '../types/launch/market';
import type { MigrationDefinition } from '../types/database/migration';

const launchTeamInvitations: MigrationDefinition = {
  name: '20261022-launch-team-invitations',
  up: async (): Promise<void> => {
    const launches = await LaunchTeamMember.aggregate<{ _id: MarketIdentity }>([
      { $group: { _id: { network: '$network', contractId: '$contractId' } } },
    ]);

    for (const launch of launches) {
      const identity = launch._id;
      const members = await LaunchTeamMember.find(identity).sort({ createdAt: 1, _id: 1 }).lean();
      const occupied = members.filter((member) => member.status !== 'canceled');

      for (const member of members) {
        if (member.status === 'canceled') {
          await LaunchTeamMember.updateOne({ _id: member._id }, { $unset: { slot: 1 } });
        }
      }

      const slots = new Set(occupied.map((member) => member.slot).filter(Boolean));

      for (const member of occupied) {
        let slot = member.slot ?? 1;

        if (!member.slot) {
          while (slots.has(slot)) {
            slot += 1;
          }
        }

        slots.add(slot);

        await LaunchTeamMember.updateOne(
          { _id: member._id },
          {
            $set: {
              slot,
              status: member.status ?? (member.kind === 'external' ? 'active' : 'pending'),
            },
          },
        );
      }
    }

    await LaunchTeamMember.createIndexes();
  },
};

export default launchTeamInvitations;
