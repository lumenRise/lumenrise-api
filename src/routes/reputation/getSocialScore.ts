import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { ReputationSnapshotResult } from '../../types/reputation/model.js';
import toReputationSnapshotResult from '../../utils/reputation/toReputationSnapshotResult.js';

const getSocialScoreRoute: RequestHandler = async (req, res) => {
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

  const snapshot = await ReputationSnapshot.findOne({
    identity: req.auth?.identityId,
    category: 'social',
  }).sort({ calculatedAt: -1 });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Social score is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<ReputationSnapshotResult> = {
    status: 'success',
    message: 'Social score retrieved',
    result: toReputationSnapshotResult(snapshot),
  };

  return res.status(200).json(response);
};

export default getSocialScoreRoute;
