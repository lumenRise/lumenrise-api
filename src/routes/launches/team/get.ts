import type { RequestHandler } from 'express';

import log from '../../../logger';
import Identity from '../../../models/Identity';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import type { MarketIdentity } from '../../../types/launch/market';
import getTeamProfiles from '../../../services/launch/getTeamProfiles';
import toTeamMemberResult from '../../../utils/launch/toTeamMemberResult';

const getLaunchTeam: RequestHandler = async (req, res) => {
  const identity = res.locals.launchIdentity as MarketIdentity;

  try {
    const members = await LaunchTeamMember.find(identity).sort({ createdAt: 1, _id: 1 }).lean();

    const users = await Identity.find({
      _id: {
        $in: members
          .filter((member) => member.kind !== 'external')
          .map((member) => member.identity),
      },
      status: 'active',
      deletedAt: null,
      ...(req.chain === 'base'
        ? { name: { $type: 'string', $ne: '' } }
        : { 'externalUserIds.0': { $exists: true } }),
    })
      .select('name avatarUrl')
      .lean();

    const profiles = await getTeamProfiles(users);

    return res.json({
      status: 'success',
      message: 'Launch team retrieved',
      result: {
        members: members
          .filter(
            (member) =>
              member.kind === 'external' ||
              (member.identity && profiles.has(member.identity.toString())),
          )
          .map((member) =>
            toTeamMemberResult(
              member,
              member.identity ? profiles.get(member.identity.toString()) : undefined,
            ),
          ),
      },
    });
  } catch (error) {
    log.error({ error }, 'Launch team lookup failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch team is unavailable', result: {} });
  }
};

export default getLaunchTeam;
