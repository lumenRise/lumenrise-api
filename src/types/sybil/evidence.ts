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
  } | null;
}

interface SybilEvidenceResult {
  identityId: string;
  algorithmVersion: string;
  generatedAt: string;
  assessment: 'not_assessed';
  observations: SybilEvidenceObservation[];
  limitations: string[];
}

export type {
  SybilEvidenceCoverage,
  SybilEvidenceObservation,
  SybilEvidenceOwnership,
  SybilProviderEvidence,
  SybilEvidenceResult,
  SybilEvidenceSource,
};
