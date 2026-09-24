import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { IntegrationSyncJobResult } from '../../types/integration/sync.js';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult.js';

const getXSyncJobRoute: RequestHandler = async (req, res) => {
  const jobIdParam = req.params.jobId;
  const jobId = typeof jobIdParam === 'string' ? jobIdParam : null;

  if (!jobId || !Types.ObjectId.isValid(jobId)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Synchronization job was not found',
      result: {},
    };

    return res.status(404).json(response);
  }

  const job = await IntegrationSyncJob.findOne({
    _id: jobId,
    identity: req.auth?.identityId,
    provider: 'x',
  });

  if (!job) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Synchronization job was not found',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<IntegrationSyncJobResult> = {
    status: 'success',
    message: 'Synchronization job retrieved',
    result: createIntegrationSyncJobResult(job),
  };

  return res.status(200).json(response);
};

export default getXSyncJobRoute;
