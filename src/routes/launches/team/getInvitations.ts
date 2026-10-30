import type { RequestHandler } from 'express';

import log from '../../../logger';
import Launch from '../../../models/Launch';
import LaunchTeamMember from '../../../models/LaunchTeamMember';

const getTeamInvitations: RequestHandler = async (req, res) => {
  try {
    const invitations = await LaunchTeamMember.find({
      chain: req.chain ?? 'stellar',
      network: req.network,
      identity: req.auth!.identityId,
      kind: 'registered',
      status: 'pending',
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    const launches = await Launch.find({
      chain: req.chain ?? 'stellar',
      network: req.network,
      contractId: { $in: invitations.map((member) => member.contractId) },
    })
      .select('contractId slug')
      .lean();

    const slugs = new Map(launches.map((launch) => [launch.contractId, launch.slug]));

    return res.json({
      status: 'success',
      message: 'Team invitations retrieved',
      result: {
        invitations: invitations.map((member) => ({
          ...(member.chain === 'base' ? { chain: 'base' } : {}),
          memberId: member._id.toString(),
          network: member.network,
          contractId: member.contractId,
          slug: slugs.get(member.contractId) ?? null,
          role: member.role,
          status: member.status,
        })),
      },
    });
  } catch (error) {
    log.error({ error }, 'Team invitations lookup failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Team invitations are unavailable', result: {} });
  }
};

export default getTeamInvitations;
