import type { RequestHandler } from 'express';

import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { ReputationSnapshotResult } from '../../types/reputation/model.js';

const getDeveloperReputationRoute: RequestHandler = async (req, res) => {
  const snapshot = await ReputationSnapshot.findOne({
    identity: req.auth?.identityId,
    category: 'developer',
  }).sort({ calculatedAt: -1 });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Developer reputation is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<ReputationSnapshotResult> = {
    status: 'success',
    message: 'Developer reputation retrieved',
    result: {
      category: snapshot.category,
      status: snapshot.status,
      algorithmVersion: snapshot.algorithmVersion,
      score: snapshot.score,
      signals: snapshot.signals.map((signal) => ({
        provider: signal.provider,
        key: signal.key,
        rawValue: signal.rawValue,
        normalizedScore: signal.normalizedScore,
        weight: signal.weight,
        contribution: signal.contribution,
        observedAt: signal.observedAt.toISOString(),
      })),
      calculatedAt: snapshot.calculatedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getDeveloperReputationRoute;
