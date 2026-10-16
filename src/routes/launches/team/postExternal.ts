import { Types } from 'mongoose';
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

const postExternalTeamMember: RequestHandler = async (req, res) => {
  const input = parseExternalTeamInput(req.body);
  const identity = res.locals.launchIdentity as MarketIdentity;

  if (!input || !req.file) {
    return res
      .status(400)
      .json({
        status: 'error',
        message: 'Name, role, image and a valid HTTPS X link are required',
        result: {},
      });
  }

  if (!isR2Configured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Image storage is not configured', result: {} });
  }

  let uploaded: StoredAvatar | null = null;

  try {
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

    const memberId = new Types.ObjectId();

    uploaded = await uploadTeamImage(identity, memberId.toString(), image);

    const member = await LaunchTeamMember.create({
      _id: memberId,
      ...identity,
      kind: 'external',
      identity: null,
      ...input,
      avatarUrl: uploaded.publicUrl,
      avatarObjectKey: uploaded.objectKey,
    });

    return res.status(201).json({
      status: 'success',
      message: 'External team member added',
      result: { member: toTeamMemberResult(member) },
    });
  } catch (error) {
    if (uploaded) {
      await deleteAvatarOrQueue(uploaded.objectKey);
    }

    log.error({ error }, 'External team member creation failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'External team member could not be added', result: {} });
  }
};

export default postExternalTeamMember;
