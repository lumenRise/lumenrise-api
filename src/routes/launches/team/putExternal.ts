import { isValidObjectId } from 'mongoose';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import type { StoredAvatar } from '../../../types/avatar';
import isR2Configured from '../../../storage/isR2Configured';
import LaunchTeamMember from '../../../models/LaunchTeamMember';
import type { MarketIdentity } from '../../../types/launch/market';
import processAvatar from '../../../services/avatar/processAvatar';
import uploadTeamImage from '../../../services/launch/uploadTeamImage';
import toTeamMemberResult from '../../../utils/launch/toTeamMemberResult';
import deleteAvatarOrQueue from '../../../services/avatar/deleteAvatarOrQueue';
import parseExternalTeamInput from '../../../utils/launch/parseExternalTeamInput';

const putExternalTeamMember: RequestHandler = async (req, res) => {
  const memberId = req.params.memberId;
  const input = parseExternalTeamInput(req.body);
  const identity = res.locals.launchIdentity as MarketIdentity;

  if (typeof memberId !== 'string' || !isValidObjectId(memberId) || !input) {
    return res
      .status(400)
      .json({
        status: 'error',
        message:
          'Valid member ID, name, role and a valid HTTPS X link are required',
        result: {},
      });
  }

  if (req.file && !isR2Configured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Image storage is not configured', result: {} });
  }

  let uploaded: StoredAvatar | null = null;

  try {
    const filter = { ...identity, _id: memberId, kind: 'external' as const };
    const existing = await LaunchTeamMember.findOne(filter).select('+avatarObjectKey').lean();

    if (!existing) {
      return res
        .status(404)
        .json({ status: 'error', message: 'External team member not found', result: {} });
    }

    if (req.file) {
      const image = await processAvatar(req.file.buffer);

      if (!image) {
        return res
          .status(400)
          .json({
            status: 'error',
            message: 'Image must be a JPEG, PNG or WebP of at least 128x128 pixels',
            result: {},
          });
      }

      uploaded = await uploadTeamImage(identity, memberId, image);
    }

    const member = await LaunchTeamMember.findOneAndUpdate(
      { ...filter, avatarObjectKey: existing.avatarObjectKey ?? null },
      {
        $set: {
          ...input,
          ...(uploaded
            ? { avatarUrl: uploaded.publicUrl, avatarObjectKey: uploaded.objectKey }
            : {}),
        },
      },
      { runValidators: true, returnDocument: 'after' },
    );

    if (!member) {
      if (uploaded) {
        await deleteAvatarOrQueue(uploaded.objectKey);
      }

      return res
        .status(409)
        .json({
          status: 'error',
          message: 'Team member changed concurrently; retry the request',
          result: {},
        });
    }

    if (uploaded && existing.avatarObjectKey) {
      await deleteAvatarOrQueue(existing.avatarObjectKey);
    }

    return res.json({
      status: 'success',
      message: 'External team member updated',
      result: { member: toTeamMemberResult(member) },
    });
  } catch (error) {
    if (uploaded) {
      await deleteAvatarOrQueue(uploaded.objectKey);
    }

    log.error({ error }, 'External team member update failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'External team member could not be updated', result: {} });
  }
};

export default putExternalTeamMember;
