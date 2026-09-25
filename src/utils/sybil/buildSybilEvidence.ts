import { SYBIL_EVIDENCE_VERSION } from '../../constants/sybil.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';
import type {
  SybilEvidenceResult,
  SybilProviderEvidence,
  SybilEvidenceObservation,
} from '../../types/sybil/evidence.js';

const buildSybilEvidence = (
  profile: ReputationProfileResult,
  providers: SybilProviderEvidence[],
  generatedAt = new Date(),
): SybilEvidenceResult => {
  const stellar = profile.stellar;
  const observations: SybilEvidenceObservation[] = [
    {
      source: 'stellar',
      ownership: stellar ? 'wallet_registration' : 'not_connected',
      coverage: stellar?.score?.availableHistoryScanned
        ? 'complete'
        : stellar?.scan && stellar.scan.pagesProcessed > 0
          ? 'partial'
          : 'missing',
      sourceIds: stellar?.score ? [stellar.score.scanId] : [],
      observedAt: stellar?.score?.calculatedAt ?? null,
      sourceVersion: stellar?.score?.algorithmVersion ?? null,
    },
  ];

  for (const provider of ['github', 'gitlab', 'x'] as const) {
    const account = providers.find((item) => item.provider === provider);

    if (!account) {
      continue;
    }

    const snapshot = account.snapshot;

    observations.push({
      source: provider,
      ownership: 'oauth_connection',
      coverage: snapshot?.status ?? 'missing',
      sourceIds: snapshot ? [snapshot.id] : [],
      observedAt: snapshot?.collectedAt ?? null,
      sourceVersion: snapshot?.dataVersion ?? null,
    });
  }

  return {
    identityId: profile.identity.id,
    algorithmVersion: SYBIL_EVIDENCE_VERSION,
    generatedAt: generatedAt.toISOString(),
    assessment: 'not_assessed',
    observations,
    limitations: [
      'Wallet proof establishes control at registration, not a unique person.',
      'OAuth connections establish account control, not independent people.',
      'Horizon may not retain complete historical activity.',
      'No cross-identity analysis or Sybil decision is performed.',
    ],
  };
};

export default buildSybilEvidence;
