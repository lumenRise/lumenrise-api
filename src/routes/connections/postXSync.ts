import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount';
import { enqueueXSync } from '../../services/integration/syncQueue';
import type { ApiResponse, EmptyResult } from '../../types/response';
import type { IntegrationSyncJobResult } from '../../types/integration/sync';
import reserveManualRefresh from '../../services/refresh/reserveManualRefresh';
import releaseManualRefresh from '../../services/refresh/releaseManualRefresh';
import sendManualRefreshLimit from '../../utils/routes/sendManualRefreshLimit';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult';
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

  const reservation = await reserveManualRefresh(account.identity, 'x-sync');

  if (!reservation.allowed) {
    return sendManualRefreshLimit(res, reservation.retryAt!);
  }

  let job;

  try {
    job = await enqueueXSync(account);
  } catch (error) {
    await releaseManualRefresh(account.identity, 'x-sync', reservation.reservedUntil!);
    throw error;
  }

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'X synchronization queued',
    result: createIntegrationSyncJobResult(job),
  };

  res.setHeader('Location', `/v1/connections/x/sync/${job._id.toString()}`);

  return res.status(202).json(response);
};

export default postXSyncRoute;
