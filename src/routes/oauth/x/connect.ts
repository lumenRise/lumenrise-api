import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response';
import { createXAuthorization } from '../../../services/oauth/x';
import type { XOAuthStartResult } from '../../../types/integration/x';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie';

const connectXOAuthRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      result: {},
    });
  }

  const flow = await createXAuthorization('connect', req.auth.identityId);

  const response: ApiResponse<XOAuthStartResult> = {
    status: 'success',
    message: 'X connection started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default connectXOAuthRoute;
