import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount';
import type { ApiResponse, EmptyResult } from '../../types/response';
import { enqueueGitHubSync } from '../../services/integration/syncQueue';
import type { IntegrationSyncJobResult } from '../../types/integration/sync';
import reserveManualRefresh from '../../services/refresh/reserveManualRefresh';
import releaseManualRefresh from '../../services/refresh/releaseManualRefresh';
import sendManualRefreshLimit from '../../utils/routes/sendManualRefreshLimit';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult';
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

  const reservation = await reserveManualRefresh(account.identity, 'github-sync');

  if (!reservation.allowed) {
    return sendManualRefreshLimit(res, reservation.retryAt!);
  }

  let job;

  try {
    job = await enqueueGitHubSync(account);
  } catch (error) {
    await releaseManualRefresh(account.identity, 'github-sync', reservation.reservedUntil!);
    throw error;
  }

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'GitHub synchronization queued',
    result: createIntegrationSyncJobResult(job),
  };

  res.setHeader('Location', `/v1/connections/github/sync/${job._id.toString()}`);

  return res.status(202).json(response);
};

export default postGitHubSyncRoute;
