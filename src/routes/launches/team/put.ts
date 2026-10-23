import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import Identity from '../../../models/Identity';
import getTeamSlot from '../../../services/launch/getTeamSlot';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import applicationRules from '../../../constants/applicationRules';
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
    role.trim().length > applicationRules.team.roleMaxLength
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid identity ID and role of 1 to 80 characters are required',
      result: {},
    });
  }

  if (identityId.toLowerCase() === req.auth!.identityId.toString()) {
    return res
      .status(400)
      .json({ status: 'error', message: 'The owner is already an active team member', result: {} });
  }

  try {
    const user = await Identity.findOne({
      _id: identityId,
      status: 'active',
      deletedAt: null,
      'externalUserIds.0': { $exists: true },
    })
      .select('name avatarUrl')
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Registered active user not found', result: {} });
    }

    const existing = await LaunchTeamMember.findOne({
      ...identity,
      kind: 'registered',
      identity: user._id,
    }).lean();

    const slot =
      existing && existing.status !== 'canceled' ? existing.slot : await getTeamSlot(identity);

    if (!slot) {
      return res.status(409).json({
        status: 'error',
        message: 'A launch can have at most six team members including its owner',
        result: {},
      });
    }

    const profiles = await getTeamProfiles([user]);

    const member = await LaunchTeamMember.findOneAndUpdate(
      {
        ...identity,
        kind: 'registered',
        identity: user._id,
        status: existing?.status ?? 'pending',
      },
      {
        $set: {
          role: role.trim(),
          slot,
          status: existing?.status === 'active' ? 'active' : 'pending',
        },
      },
      { upsert: !existing, runValidators: true, returnDocument: 'after' },
    );

    if (!member) {
      return res.status(409).json({
        status: 'error',
        message: 'Team member changed concurrently; retry the request',
        result: {},
      });
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
      return res.status(409).json({
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
