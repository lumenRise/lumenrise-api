import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import type { MarketIdentity } from '../../../types/launch/market';

const deleteLaunchTeamMember: RequestHandler = async (req, res) => {
  const identityId = req.params.identityId;
  const identity = res.locals.launchIdentity as MarketIdentity;

  if (typeof identityId !== 'string' || !isValidObjectId(identityId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid identity ID', result: {} });
  }

  try {
    await LaunchTeamMember.deleteOne({ ...identity, kind: 'registered', identity: identityId });

    return res.json({ status: 'success', message: 'Launch team member removed', result: {} });
  } catch (error) {
    log.error({ error }, 'Launch team member removal failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch team member could not be removed', result: {} });
  }
};

export default deleteLaunchTeamMember;
