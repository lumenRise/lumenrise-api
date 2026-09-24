import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response.js';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie.js';
import { createGitLabAuthorization } from '../../../services/oauth/gitlab.js';
import type { GitLabOAuthStartResult } from '../../../types/integration/gitlab.js';

const connectGitLabOAuthRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      result: {},
    });
  }

  const flow = await createGitLabAuthorization('connect', req.auth.identityId);

  const response: ApiResponse<GitLabOAuthStartResult> = {
    status: 'success',
    message: 'GitLab connection started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default connectGitLabOAuthRoute;
