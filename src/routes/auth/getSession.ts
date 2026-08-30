import type { RequestHandler } from 'express';

import Session from '../../models/Session.js';
import type { ApiResponse } from '../../types/response.js';
import type { SessionResult } from '../../types/auth/model.js';

const getSessionRoute: RequestHandler = async (req, res) => {
  const session = await Session.findById(req.auth?.sessionId).select('expiresAt');

  if (!session || !req.auth) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired session',
      result: {},
    });
  }

  const response: ApiResponse<SessionResult> = {
    status: 'success',
    message: 'Active session',
    result: {
      identityId: req.auth.identityId.toString(),
      expiresAt: session.expiresAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getSessionRoute;
