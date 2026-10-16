import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import type { MarketIdentity } from '../../../types/launch/market';
import deleteAvatarOrQueue from '../../../services/avatar/deleteAvatarOrQueue';

const deleteExternalTeamMember: RequestHandler = async (req, res) => {
  const memberId = req.params.memberId;
  const identity = res.locals.launchIdentity as MarketIdentity;

  if (typeof memberId !== 'string' || !isValidObjectId(memberId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid team member ID', result: {} });
  }

  try {
    const member = await LaunchTeamMember.findOneAndDelete({
      ...identity,
      _id: memberId,
      kind: 'external',
    }).select('+avatarObjectKey');

    if (member?.avatarObjectKey) {
      await deleteAvatarOrQueue(member.avatarObjectKey);
    }

    return res.json({ status: 'success', message: 'External team member removed', result: {} });
  } catch (error) {
    log.error({ error }, 'External team member removal failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'External team member could not be removed', result: {} });
  }
};

export default deleteExternalTeamMember;
