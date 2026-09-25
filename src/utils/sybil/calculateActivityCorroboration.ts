import type { ReputationProfileResult } from '../../types/reputation/profile.js';
import type {
  SybilCorroborationResult,
  SybilProviderEvidence,
} from '../../types/sybil/evidence.js';

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Activity corroborates control of independent accounts, not uniqueness of a person.
const calculateActivityCorroboration = (
  profile: ReputationProfileResult,
  providers: SybilProviderEvidence[],
  generatedAt: Date,
): SybilCorroborationResult => {
  const signals: SybilCorroborationResult['signals'] = [];
  const missingSources: SybilCorroborationResult['missingSources'] = [];
  const sources = ['github', 'gitlab', 'stellar'] as const;
  const valid = (value: number | null): value is number =>
    value !== null && Number.isFinite(value) && value >= 0;
  const fresh = (timestamp: string): boolean => {
    const age = generatedAt.getTime() - Date.parse(timestamp);
    return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS;
  };

  for (const source of sources) {
    if (source === 'stellar') {
      const scan = profile.stellar?.scan;
      const score = profile.stellar?.score;
      const summary = scan?.summary;
      if (
        !profile.identity.primaryWalletAddress ||
        profile.stellar?.address !== profile.identity.primaryWalletAddress ||
        scan?.address !== profile.identity.primaryWalletAddress ||
        !profile.stellar?.ownershipVerified ||
        scan?.status !== 'completed' ||
        !scan.availableHistoryScanned ||
        !scan.completedAt ||
        !score ||
        score.scanId !== scan.id ||
        !fresh(scan.completedAt) ||
        !summary ||
        !valid(summary.activeDayCount) ||
        !valid(summary.initiatedOperationCount)
      ) {
        missingSources.push(source);
        continue;
      }
      for (const [key, rawValue, scale] of [
        ['active_days', summary.activeDayCount, 30],
        ['initiated_operations', summary.initiatedOperationCount, 100],
      ] as const) {
        signals.push({
          source,
          key,
          rawValue,
          normalizedValue: Math.round(10000 * (1 - Math.exp(-rawValue / scale))) / 100,
          sourceId: scan.id,
        });
      }
      continue;
    }

    const snapshot = providers.find((provider) => provider.provider === source)?.snapshot;
    if (
      !snapshot ||
      snapshot.status !== 'complete' ||
      !snapshot.profileCovered ||
      !snapshot.activityCovered ||
      !fresh(snapshot.collectedAt) ||
      !valid(snapshot.accountAgeDays) ||
      !valid(snapshot.commitCount)
    ) {
      missingSources.push(source);
      continue;
    }
    for (const [key, rawValue, scale] of [
      ['account_age_days', snapshot.accountAgeDays, 365],
      ['commits', snapshot.commitCount, 100],
    ] as const) {
      signals.push({
        source,
        key,
        rawValue,
        normalizedValue: Math.round(10000 * (1 - Math.exp(-rawValue / scale))) / 100,
        sourceId: snapshot.id,
      });
    }
  }

  return {
    algorithmVersion: 'activity-corroboration-v1',
    status: missingSources.length ? 'insufficient_data' : 'available',
    score: missingSources.length
      ? null
      : Math.round(
          (signals.reduce((sum, signal) => sum + signal.normalizedValue, 0) / signals.length) * 100,
        ) / 100,
    missingSources,
    signals,
  };
};

export default calculateActivityCorroboration;
