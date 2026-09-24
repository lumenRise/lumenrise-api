import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { XDataSnapshotDocument } from '../../types/reputation/x.js';
import type { ReputationSnapshotDocument } from '../../types/reputation/model.js';
import { calculateSocialScore } from '../../utils/services/reputation/socialScore/calculateSocialScore.js';
import { createXSocialSignals } from '../../utils/services/reputation/socialScore/createXSocialSignals.js';
import { normalizeSocialSignal } from '../../utils/services/reputation/socialScore/normalizeSocialSignal.js';

const SOCIAL_ALGORITHM_VERSION = 'social-v1';

const calculateAndStoreSocialReputation = async (
  snapshot: XDataSnapshotDocument,
  calculatedAt = new Date(),
): Promise<ReputationSnapshotDocument | null> => {
  const account = await ExternalAccount.findOne({
    _id: snapshot.externalAccount,
    identity: snapshot.identity,
    provider: 'x',
    status: 'connected',
  }).select('_id');

  if (!account) {
    return null;
  }

  const calculation = calculateSocialScore(createXSocialSignals(snapshot));

  const reputation = await ReputationSnapshot.create({
    identity: snapshot.identity,
    category: 'social',
    status: snapshot.status,
    algorithmVersion: SOCIAL_ALGORITHM_VERSION,
    score: calculation.score,
    signals: calculation.signals,
    sources: [
      {
        provider: 'x',
        snapshot: snapshot._id,
        dataVersion: snapshot.dataVersion,
        collectedAt: snapshot.collectedAt,
      },
    ],
    calculatedAt,
  });

  const stillConnected = await ExternalAccount.exists({
    _id: account._id,
    status: 'connected',
  });

  if (!stillConnected) {
    await ReputationSnapshot.deleteOne({ _id: reputation._id });

    return null;
  }

  return reputation;
};

export {
  SOCIAL_ALGORITHM_VERSION,
  calculateAndStoreSocialReputation,
  calculateSocialScore,
  createXSocialSignals,
  normalizeSocialSignal,
};
