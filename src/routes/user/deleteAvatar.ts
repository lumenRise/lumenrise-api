import type { RequestHandler } from 'express';

import log from '../../logger';
import removeAvatar from '../../services/avatar/removeAvatar';
import isAvatarStorageConfigured from '../../services/avatar/isAvatarStorageConfigured';

const deleteAvatarRoute: RequestHandler = async (req, res) => {
  if (!isAvatarStorageConfigured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar storage is not configured', result: {} });
  }

  try {
    const outcome = await removeAvatar(req.auth!.identityId);

    if (outcome.status === 'missing') {
      return res.status(404).json({ status: 'error', message: 'Identity not found', result: {} });
    }

    if (outcome.status === 'conflict') {
      return res.status(409).json({
        status: 'error',
        message: 'Avatar changed concurrently; retry deletion',
        result: {},
      });
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Avatar removed', result: outcome.result });
  } catch (error) {
    log.error({ error }, 'Avatar deletion failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar deletion is unavailable', result: {} });
  }
};

export default deleteAvatarRoute;
