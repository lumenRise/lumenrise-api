import type { RequestHandler } from 'express';

import log from '../../../logger';
import LaunchTeamMember from '../../../models/LaunchTeamMember';

const getTeamInvitations: RequestHandler = async (req, res) => {
  try {
    const invitations = await LaunchTeamMember.find({
      network: req.network,
      identity: req.auth!.identityId,
      kind: 'registered',
      status: 'pending',
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({
      status: 'success',
      message: 'Team invitations retrieved',
      result: {
        invitations: invitations.map((member) => ({
          memberId: member._id.toString(),
          network: member.network,
          contractId: member.contractId,
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
