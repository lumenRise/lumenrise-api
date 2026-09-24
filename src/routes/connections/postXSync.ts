import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import { enqueueXSync } from '../../services/integration/syncQueue.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { IntegrationSyncJobResult } from '../../types/integration/sync.js';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult.js';

const postXSyncRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'x',
    status: 'connected',
  });

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'X account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const job = await enqueueXSync(account);

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'X synchronization queued',
    result: createIntegrationSyncJobResult(job),
  };

  res.setHeader('Location', `/v1/connections/x/sync/${job._id.toString()}`);

  return res.status(202).json(response);
};

export default postXSyncRoute;
