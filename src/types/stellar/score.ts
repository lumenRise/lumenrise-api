interface StellarActivityScoreSignal {
  key: string;
  rawValue: number;
  scale: number;
  baseWeight: number;
  normalizedScore: number;
  weight: number;
  contribution: number;
}

interface StellarActivityScoreResult {
  address: string;
  ownershipVerified: false;
  eligibilityProof: false;
  source: 'horizon';
  scanId: string;
  algorithmVersion: string;
  availableHistoryScanned: true;
  pagesProcessed: number;
  score: number;
  signals: StellarActivityScoreSignal[];
  calculatedAt: string;
}

export type { StellarActivityScoreResult, StellarActivityScoreSignal };
