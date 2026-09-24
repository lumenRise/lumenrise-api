import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../../types/response.js';
import { setOAuthStateCookie } from '../../../services/oauth/stateCookie.js';
import { createGitLabAuthorization } from '../../../services/oauth/gitlab.js';
import type { GitLabOAuthStartResult } from '../../../types/integration/gitlab.js';

const startGitLabOAuthRoute: RequestHandler = async (_req, res) => {
  const flow = await createGitLabAuthorization('register', null);

  const response: ApiResponse<GitLabOAuthStartResult> = {
    status: 'success',
    message: 'GitLab authorization started',
    result: { authorizationUrl: flow.authorizationUrl },
  };

  setOAuthStateCookie(res, flow.state);

  return res.status(200).json(response);
};

export default startGitLabOAuthRoute;
