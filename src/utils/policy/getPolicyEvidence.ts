import type { PolicyDimension } from '../../types/policy/model.js';
import type { PolicyEvidence } from '../../types/policy/evaluation.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';

const getPolicyEvidence = (
  dimension: PolicyDimension,
  profile: ReputationProfileResult,
): PolicyEvidence => {
  if (dimension === 'stellar') {
    const stellar = profile.stellar;

    if (!stellar) {
      return {
        state: 'missing',
        score: null,
        algorithmVersion: null,
        calculatedAt: null,
        sourceIds: [],
      };
    }

    if (
      !stellar.ownershipVerified ||
      stellar.scanStatus !== 'completed' ||
      !stellar.score ||
      !stellar.score.ownershipVerified ||
      !stellar.score.availableHistoryScanned
    ) {
      return {
        state: 'incomplete',
        score: null,
        algorithmVersion: null,
        calculatedAt: null,
        sourceIds: [],
      };
    }

    return {
      state: 'ready',
      score: stellar.score.score,
      algorithmVersion: stellar.score.algorithmVersion,
      calculatedAt: stellar.score.calculatedAt,
      sourceIds: [stellar.score.scanId],
    };
  }

  const snapshot = profile[dimension];

  if (!snapshot) {
    return {
      state: 'missing',
      score: null,
      algorithmVersion: null,
      calculatedAt: null,
      sourceIds: [],
    };
  }

  if (snapshot.status !== 'complete' || snapshot.score === null) {
    return {
      state: 'incomplete',
      score: null,
      algorithmVersion: snapshot.algorithmVersion,
      calculatedAt: snapshot.calculatedAt,
      sourceIds: snapshot.sources.map((source) => source.snapshotId),
    };
  }

  return {
    state: 'ready',
    score: snapshot.score,
    algorithmVersion: snapshot.algorithmVersion,
    calculatedAt: snapshot.calculatedAt,
    sourceIds: snapshot.sources.map((source) => source.snapshotId),
  };
};

export default getPolicyEvidence;
