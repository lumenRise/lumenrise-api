import type { RequestHandler } from 'express';

import log from '../../logger';
import replaceAvatar from '../../services/avatar/replaceAvatar';
import isAvatarStorageConfigured from '../../services/avatar/isAvatarStorageConfigured';

const putAvatarRoute: RequestHandler = async (req, res) => {
  if (!isAvatarStorageConfigured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar storage is not configured', result: {} });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Avatar file is required', result: {} });
  }

  try {
    const outcome = await replaceAvatar(req.auth!.identityId, req.file.buffer);

    if (outcome.status === 'invalid') {
      return res.status(400).json({
        status: 'error',
        message: 'Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels',
        result: {},
      });
    }

    if (outcome.status === 'missing') {
      return res.status(404).json({ status: 'error', message: 'Identity not found', result: {} });
    }

    if (outcome.status === 'conflict') {
      return res.status(409).json({
        status: 'error',
        message: 'Avatar changed concurrently; retry the upload',
        result: {},
      });
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Avatar updated', result: outcome.result });
  } catch (error) {
    log.error({ error }, 'Avatar update failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar update is unavailable', result: {} });
  }
};

export default putAvatarRoute;
