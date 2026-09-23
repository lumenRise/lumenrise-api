import type { Types } from 'mongoose';

import type { ReputationSnapshotStatus } from './model.js';

type DeveloperReputationProvider = 'github' | 'gitlab';

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
  status: ReputationSnapshotStatus;
  score: number;
  signals: Array<{
    provider: DeveloperReputationProvider;
    key: string;
    rawValue: number;
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
  DeveloperSignalInput,
};
