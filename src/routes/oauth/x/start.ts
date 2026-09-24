import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response.js';
import { createXAuthorization } from '../../../services/oauth/x.js';
import type { XOAuthStartResult } from '../../../types/integration/x.js';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie.js';

const startXOAuthRoute: RequestHandler = async (_req, res) => {
  const flow = await createXAuthorization('register', null);

  const response: ApiResponse<XOAuthStartResult> = {
    status: 'success',
    message: 'X authorization started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default startXOAuthRoute;
