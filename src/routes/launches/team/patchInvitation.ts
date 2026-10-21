import type { RequestHandler } from 'express';

import log from '../../../logger';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import parseMarketRequest from '../../../utils/launch/parseMarketRequest';

const patchTeamInvitation: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);
  const status: unknown = req.body?.status;

  if (!identity || (status !== 'active' && status !== 'canceled')) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid launch and active or canceled status are required',
      result: {},
    });
  }

  try {
    const member = await LaunchTeamMember.findOneAndUpdate(
      {
        ...identity,
        kind: 'registered',
        identity: req.auth!.identityId,
        status: 'pending',
        slot: { $gte: 1, $lte: 5 },
      },
      { $set: { status }, ...(status === 'canceled' ? { $unset: { slot: 1 } } : {}) },
      { runValidators: true, returnDocument: 'after' },
    );

    if (!member) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Pending invitation not found', result: {} });
    }

    return res.json({
      status: 'success',
      message: 'Team invitation updated',
      result: { status: member.status },
    });
  } catch (error) {
    log.error({ error }, 'Team invitation update failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Team invitation could not be updated', result: {} });
  }
};

export default patchTeamInvitation;
