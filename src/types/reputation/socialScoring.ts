import type { ReputationSignalRecord } from './model.js';

interface SocialSignalInput {
  key: string;
  rawValue: number;
  baseWeight: number;
  scale: number;
  observedAt: Date;
}

interface SocialScoreCalculation {
  score: number;
  signals: ReputationSignalRecord[];
}

export type { SocialScoreCalculation, SocialSignalInput };
