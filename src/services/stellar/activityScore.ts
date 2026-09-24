import type { StellarActivityScanDocument } from '../../types/stellar/scan.js';
import type {
  StellarActivityScoreResult,
  StellarActivityScoreSignal,
} from '../../types/stellar/score.js';

const STELLAR_ACTIVITY_ALGORITHM_VERSION = 'stellar-activity-v1';

const round = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

const normalizeActivitySignal = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(rawValue) || rawValue < 0 || !Number.isFinite(scale) || scale <= 0) {
    throw new Error('Invalid Stellar activity score signal');
  }

  return round(100 * (1 - Math.exp(-rawValue / scale)), 4);
};

const calculateStellarActivityScore = (
  scan: StellarActivityScanDocument,
): StellarActivityScoreResult => {
  if (scan.status !== 'completed' || !scan.completedAt) {
    throw new Error('Stellar activity score requires a completed scan');
  }

  const metrics = scan.summary;

  const definitions = [
    { key: 'active_day_count', rawValue: metrics.activeDayCount, baseWeight: 0.4, scale: 45 },
    {
      key: 'distinct_transaction_count',
      rawValue: metrics.distinctTransactionCount,
      baseWeight: 0.25,
      scale: 150,
    },
    {
      key: 'initiated_operation_count',
      rawValue: metrics.initiatedOperationCount,
      baseWeight: 0.2,
      scale: 150,
    },
    {
      key: 'operation_type_diversity',
      rawValue: Object.values(metrics.operationTypeCounts).filter((count) => count > 0).length,
      baseWeight: 0.15,
      scale: 6,
    },
  ];

  const totalWeight = definitions.reduce((total, signal) => total + signal.baseWeight, 0);

  const signals: StellarActivityScoreSignal[] = definitions.map((definition) => {
    const normalizedScore = normalizeActivitySignal(definition.rawValue, definition.scale);
    const weight = round(definition.baseWeight / totalWeight, 6);

    return {
      ...definition,
      normalizedScore,
      weight,
      contribution: round(normalizedScore * weight, 4),
    };
  });

  return {
    address: scan.address,
    ownershipVerified: false,
    eligibilityProof: false,
    source: 'horizon',
    scanId: scan._id.toString(),
    algorithmVersion: STELLAR_ACTIVITY_ALGORITHM_VERSION,
    availableHistoryScanned: true,
    pagesProcessed: scan.pagesProcessed,
    score: round(
      signals.reduce((total, signal) => total + signal.contribution, 0),
      2,
    ),
    signals,
    calculatedAt: scan.completedAt.toISOString(),
  };
};

export {
  STELLAR_ACTIVITY_ALGORITHM_VERSION,
  calculateStellarActivityScore,
  normalizeActivitySignal,
};
