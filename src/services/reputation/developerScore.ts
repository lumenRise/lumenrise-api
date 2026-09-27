import type { Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import type { ReputationSnapshotDocument } from '../../types/reputation/model.js';
import { createGitHubSignals } from '../../utils/services/reputation/developerScore/createGitHubSignals.js';
import type {
  DeveloperReputationSourceInput,
  DeveloperSignalInput,
} from '../../types/reputation/scoring.js';
import { calculateDeveloperScore } from '../../utils/services/reputation/developerScore/calculateDeveloperScore.js';
import { normalizeDiminishingReturns } from '../../utils/services/reputation/developerScore/normalizeDiminishingReturns.js';

const DEVELOPER_ALGORITHM_VERSION = 'developer-v2';

const calculateAndStoreDeveloperReputation = async (
  identityId: Types.ObjectId,
  calculatedAt = new Date(),
): Promise<ReputationSnapshotDocument> => {
  const accounts = await ExternalAccount.find({
    identity: identityId,
    provider: 'github',
    status: 'connected',
  });

  const githubAccount = accounts.find((account) => account.provider === 'github');
  const githubSnapshot = githubAccount
    ? await GitHubDataSnapshot.findOne({ externalAccount: githubAccount._id }).sort({ collectedAt: -1 })
    : null;

  const inputs: DeveloperSignalInput[] = [];
  const sources: DeveloperReputationSourceInput[] = [];

  if (githubSnapshot) {
    inputs.push(...createGitHubSignals(githubSnapshot));
    sources.push({
      provider: 'github',
      snapshot: githubSnapshot._id,
      dataVersion: githubSnapshot.dataVersion,
      collectedAt: githubSnapshot.collectedAt,
      status: githubSnapshot.status,
    });
  }

  if (sources.length === 0) {
    return ReputationSnapshot.create({
      identity: identityId,
      category: 'developer',
      status: 'failed',
      algorithmVersion: DEVELOPER_ALGORITHM_VERSION,
      score: null,
      signals: [],
      sources: [],
      calculatedAt,
    });
  }

  const status =
    sources.length === accounts.length && sources.every((source) => source.status === 'complete')
      ? 'complete'
      : 'partial';

  const calculation = calculateDeveloperScore(inputs, status);

  return ReputationSnapshot.create({
    identity: identityId,
    category: 'developer',
    status: calculation.status,
    algorithmVersion: DEVELOPER_ALGORITHM_VERSION,
    score: calculation.score,
    signals: calculation.signals,
    sources: sources.map((source) => ({
      provider: source.provider,
      snapshot: source.snapshot,
      dataVersion: source.dataVersion,
      collectedAt: source.collectedAt,
    })),
    calculatedAt,
  });
};

export {
  DEVELOPER_ALGORITHM_VERSION,
  calculateAndStoreDeveloperReputation,
  calculateDeveloperScore,
  createGitHubSignals,
  normalizeDiminishingReturns,
};
