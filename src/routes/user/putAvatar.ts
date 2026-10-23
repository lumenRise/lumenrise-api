import type { RequestHandler } from 'express';

import log from '../../logger';
import replaceAvatar from '../../services/avatar/replaceAvatar';
import updateProfileName from '../../services/avatar/updateProfileName';
import isAvatarStorageConfigured from '../../services/avatar/isAvatarStorageConfigured';

const putAvatarRoute: RequestHandler = async (req, res) => {
  const requestedName: unknown = req.body?.name;
  const name = typeof requestedName === 'string' ? requestedName.trim() : undefined;

  if (
    requestedName !== undefined &&
    (name === undefined || name.length === 0 || name.length > 80)
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Name must be a non-empty string of at most 80 characters',
      result: {},
    });
  }

  for (const field of Object.keys(req.body ?? {})) {
    if (field !== 'name') {
      return res
        .status(400)
        .json({ status: 'error', message: 'Unknown profile field', result: {} });
    }
  }

  if (!req.file && name === undefined) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Avatar file or name is required', result: {} });
  }

  if (req.file && !isAvatarStorageConfigured()) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Avatar storage is not configured', result: {} });
  }

  try {
    const outcome = req.file
      ? name === undefined
        ? await replaceAvatar(req.auth!.identityId, req.file.buffer)
        : await replaceAvatar(req.auth!.identityId, req.file.buffer, name)
      : await updateProfileName(req.auth!.identityId, name!);

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

    return res.status(200).json({
      status: 'success',
      message: name === undefined ? 'Avatar updated' : 'Profile updated',
      result: outcome.result,
    });
  } catch (error) {
    log.error({ error }, 'Profile update failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Profile update is unavailable', result: {} });
  }
};

export default putAvatarRoute;
