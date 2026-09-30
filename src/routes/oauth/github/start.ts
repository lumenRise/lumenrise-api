import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie';
import { createGitHubAuthorization } from '../../../services/oauth/github';
import type { GitHubOAuthStartResult } from '../../../types/integration/github';
const startGitHubOAuthRoute: RequestHandler = async (_req, res) => {
  const flow = await createGitHubAuthorization('register', null);

  const response: ApiResponse<GitHubOAuthStartResult> = {
    status: 'success',
    message: 'GitHub authorization started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default startGitHubOAuthRoute;
