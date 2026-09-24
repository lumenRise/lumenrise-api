import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { enqueueGitHubSync } from '../../services/integration/syncQueue.js';
import type { IntegrationSyncJobResult } from '../../types/integration/sync.js';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult.js';

const postGitHubSyncRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'github',
    status: 'connected',
  });

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitHub account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const job = await enqueueGitHubSync(account);

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'GitHub synchronization queued',
    result: createIntegrationSyncJobResult(job),
  };

  res.setHeader('Location', `/v1/connections/github/sync/${job._id.toString()}`);

  return res.status(202).json(response);
};

export default postGitHubSyncRoute;
