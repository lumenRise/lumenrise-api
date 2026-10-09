import type { RequestHandler } from 'express';

import log from '../../logger';
import Identity from '../../models/Identity';
import type { AvatarResult } from '../../types/avatar';
import type { ApiResponse } from '../../types/response';

const getMeRoute: RequestHandler = async (req, res) => {
  try {
    const identity = await Identity.findById(req.auth!.identityId).select('name avatarUrl');

    if (!identity) {
      return res.status(404).json({ status: 'error', message: 'Identity not found', result: {} });
    }

    const response: ApiResponse<AvatarResult> = {
      status: 'success',
      message: 'Profile retrieved',
      result: {
        identityId: identity._id.toString(),
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error }, 'Profile lookup failed');
    return res.status(503).json({ status: 'error', message: 'Profile is unavailable', result: {} });
  }
};

export default getMeRoute;
