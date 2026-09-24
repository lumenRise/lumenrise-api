import type { RequestHandler } from 'express';

import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { ReputationSnapshotResult } from '../../types/reputation/model.js';
import toReputationSnapshotResult from '../../utils/reputation/toReputationSnapshotResult.js';

const getDeveloperScoreRoute: RequestHandler = async (req, res) => {
  const snapshot = await ReputationSnapshot.findOne({
    identity: req.auth?.identityId,
    category: 'developer',
  }).sort({ calculatedAt: -1 });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Developer score is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<ReputationSnapshotResult> = {
    status: 'success',
    message: 'Developer score retrieved',
    result: toReputationSnapshotResult(snapshot),
  };

  return res.status(200).json(response);
};

export default getDeveloperScoreRoute;
