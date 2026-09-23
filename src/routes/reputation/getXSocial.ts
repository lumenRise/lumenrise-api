import type { RequestHandler } from 'express';

import XDataSnapshot from '../../models/XDataSnapshot.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { XDataSnapshotResult } from '../../types/reputation/x.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';

const getXSocialRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'x',
    status: 'connected',
  }).select('_id');

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'X account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const snapshot = await XDataSnapshot.findOne({ externalAccount: account._id }).sort({
    collectedAt: -1,
  });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'X social data is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<XDataSnapshotResult> = {
    status: 'success',
    message: 'X social data retrieved',
    result: {
      provider: 'x',
      status: snapshot.status,
      dataVersion: snapshot.dataVersion,
      username: snapshot.username,
      coverage: snapshot.coverage,
      metrics: snapshot.metrics,
      activityFrom: snapshot.activityFrom?.toISOString() ?? null,
      activityTo: snapshot.activityTo.toISOString(),
      collectedAt: snapshot.collectedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getXSocialRoute;
