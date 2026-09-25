import type { ExternalAccountProvider } from '../integration/model.js';

type SybilEvidenceSource = 'stellar' | ExternalAccountProvider;
type SybilEvidenceOwnership = 'wallet_registration' | 'oauth_connection' | 'not_connected';
type SybilEvidenceCoverage = 'complete' | 'partial' | 'missing';

interface SybilEvidenceObservation {
  source: SybilEvidenceSource;
  ownership: SybilEvidenceOwnership;
  coverage: SybilEvidenceCoverage;
  sourceIds: string[];
  observedAt: string | null;
  sourceVersion: string | null;
}

interface SybilProviderEvidence {
  provider: ExternalAccountProvider;
  snapshot: {
    id: string;
    status: 'complete' | 'partial';
    dataVersion: string;
    collectedAt: string;
    profileCovered: boolean;
    activityCovered: boolean;
    accountAgeDays: number | null;
    commitCount: number | null;
  } | null;
}

interface SybilCorroborationResult {
  algorithmVersion: 'activity-corroboration-v1';
  status: 'available' | 'insufficient_data';
  score: number | null;
  missingSources: Array<'github' | 'gitlab' | 'stellar'>;
  signals: Array<{
    source: 'github' | 'gitlab' | 'stellar';
    key: string;
    rawValue: number;
    normalizedValue: number;
    sourceId: string;
  }>;
}

interface SybilEvidenceResult {
  identityId: string;
  algorithmVersion: string;
  generatedAt: string;
  assessment: 'not_assessed';
  corroboration: SybilCorroborationResult;
  observations: SybilEvidenceObservation[];
  limitations: string[];
}

export type {
  SybilEvidenceCoverage,
  SybilEvidenceObservation,
  SybilEvidenceOwnership,
  SybilProviderEvidence,
  SybilCorroborationResult,
  SybilEvidenceResult,
  SybilEvidenceSource,
};
