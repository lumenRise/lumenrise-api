import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { ReputationSnapshotResult } from '../../types/reputation/model.js';

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
    result: {
      category: snapshot.category,
      status: snapshot.status,
      algorithmVersion: snapshot.algorithmVersion,
      score: snapshot.score,
      signals: snapshot.signals.map((signal) => ({
        provider: signal.provider,
        key: signal.key,
        rawValue: signal.rawValue,
        normalization: signal.normalization,
        scale: signal.scale,
        baseWeight: signal.baseWeight,
        normalizedScore: signal.normalizedScore,
        weight: signal.weight,
        contribution: signal.contribution,
        observedAt: signal.observedAt.toISOString(),
      })),
      sources: snapshot.sources.map((source) => ({
        provider: source.provider,
        snapshotId: source.snapshot.toString(),
        dataVersion: source.dataVersion,
        collectedAt: source.collectedAt.toISOString(),
      })),
      calculatedAt: snapshot.calculatedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getSocialScoreRoute;
