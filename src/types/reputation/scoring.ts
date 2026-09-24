import type { Types } from 'mongoose';

type DeveloperReputationProvider = 'github' | 'gitlab';
type DeveloperReputationStatus = 'complete' | 'partial';

interface DeveloperSignalInput {
  provider: DeveloperReputationProvider;
  key: string;
  rawValue: number;
  baseWeight: number;
  scale: number;
  observedAt: Date;
}

interface DeveloperReputationSourceInput {
  provider: DeveloperReputationProvider;
  snapshot: Types.ObjectId;
  dataVersion: string;
  collectedAt: Date;
  status: 'complete' | 'partial';
}

interface DeveloperReputationCalculation {
  status: DeveloperReputationStatus;
  score: number;
  signals: Array<{
    provider: DeveloperReputationProvider;
    key: string;
    rawValue: number;
    normalization: 'diminishing_returns';
    scale: number;
    baseWeight: number;
    normalizedScore: number;
    weight: number;
    contribution: number;
    observedAt: Date;
  }>;
}

export type {
  DeveloperReputationCalculation,
  DeveloperReputationProvider,
  DeveloperReputationSourceInput,
  DeveloperReputationStatus,
  DeveloperSignalInput,
};
