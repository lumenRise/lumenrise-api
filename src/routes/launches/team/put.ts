import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import Identity from '../../../models/Identity';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import type { MarketIdentity } from '../../../types/launch/market';
import getTeamProfiles from '../../../services/launch/getTeamProfiles';
import toTeamMemberResult from '../../../utils/launch/toTeamMemberResult';

const putLaunchTeamMember: RequestHandler = async (req, res) => {
  const identityId = req.params.identityId;
  const role: unknown = req.body?.role;
  const identity = res.locals.launchIdentity as MarketIdentity;

  if (
    typeof identityId !== 'string' ||
    !isValidObjectId(identityId) ||
    typeof role !== 'string' ||
    !role.trim() ||
    role.trim().length > 80
  ) {
    return res
      .status(400)
      .json({
        status: 'error',
        message: 'A valid identity ID and role of 1 to 80 characters are required',
        result: {},
      });
  }

  try {
    const user = await Identity.findOne({
      _id: identityId,
      status: 'active',
      deletedAt: null,
      externalUserId: { $type: 'string', $ne: '' },
    })
      .select('name avatarUrl')
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Registered active user not found', result: {} });
    }

    const profiles = await getTeamProfiles([user]);

    const member = await LaunchTeamMember.findOneAndUpdate(
      { ...identity, kind: 'registered', identity: user._id },
      { $set: { role: role.trim() } },
      { upsert: true, runValidators: true, returnDocument: 'after' },
    );

    if (!member) {
      throw new Error('Team member was not saved');
    }

    return res.json({
      status: 'success',
      message: 'Launch team member saved',
      result: {
        member: toTeamMemberResult(member, profiles.get(user._id.toString())),
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res
        .status(409)
        .json({
          status: 'error',
          message: 'Team member changed concurrently; retry the request',
          result: {},
        });
    }

    log.error({ error }, 'Launch team member save failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch team member could not be saved', result: {} });
  }
};

export default putLaunchTeamMember;
