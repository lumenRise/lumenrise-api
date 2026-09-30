import type { RequestHandler } from 'express';

import type { ApiResponse, EmptyResult } from '../../types/response';
import type { ReputationSnapshotResult } from '../../types/reputation/model';
import getCurrentReputationSnapshot from '../../services/reputation/currentSnapshot';
import toReputationSnapshotResult from '../../utils/reputation/toReputationSnapshotResult';
const getDeveloperScoreRoute: RequestHandler = async (req, res) => {
  const snapshot = await getCurrentReputationSnapshot(req.auth!.identityId, 'developer');

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
