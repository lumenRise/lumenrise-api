import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response';
import { createXAuthorization } from '../../../services/oauth/x';
import type { XOAuthStartResult } from '../../../types/integration/x';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie';

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
