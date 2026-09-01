import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response.js';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie.js';
import { createGitHubAuthorization } from '../../../services/oauth/github.js';
import type { GitHubOAuthStartResult } from '../../../types/integration/github.js';

const connectGitHubOAuthRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      result: {},
    });
  }

  const flow = await createGitHubAuthorization('connect', req.auth.identityId);
  const response: ApiResponse<GitHubOAuthStartResult> = {
    status: 'success',
    message: 'GitHub connection started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default connectGitHubOAuthRoute;
