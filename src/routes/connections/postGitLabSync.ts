import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { enqueueGitLabSync } from '../../services/integration/syncQueue.js';
import type { IntegrationSyncJobResult } from '../../types/integration/sync.js';
import reserveManualRefresh from '../../services/refresh/reserveManualRefresh.js';
import sendManualRefreshLimit from '../../utils/routes/sendManualRefreshLimit.js';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult.js';

const postGitLabSyncRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'gitlab',
    status: 'connected',
  });

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitLab account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const reservation = await reserveManualRefresh(account.identity, 'gitlab-sync');

  if (!reservation.allowed) {
    return sendManualRefreshLimit(res, reservation.retryAt!);
  }

  const job = await enqueueGitLabSync(account);

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'GitLab synchronization queued',
    result: createIntegrationSyncJobResult(job),
  };

  res.setHeader('Location', `/v1/connections/gitlab/sync/${job._id.toString()}`);

  return res.status(202).json(response);
};

export default postGitLabSyncRoute;
