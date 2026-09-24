import type {
  ReputationSnapshotDocument,
  ReputationSnapshotResult,
} from '../../types/reputation/model.js';

const toReputationSnapshotResult = (
  snapshot: ReputationSnapshotDocument,
): ReputationSnapshotResult => ({
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
});

export default toReputationSnapshotResult;
