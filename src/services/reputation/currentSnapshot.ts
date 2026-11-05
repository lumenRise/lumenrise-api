import type { Types } from 'mongoose';

import XDataSnapshot from '../../models/XDataSnapshot';
import ExternalAccount from '../../models/ExternalAccount';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot';
import ReputationSnapshot from '../../models/ReputationSnapshot';
import ReputationCleanupJob from '../../models/ReputationCleanupJob';
import type { ReputationCategory } from '../../types/reputation/model';
import type { ReputationSnapshotDocument } from '../../types/reputation/model';

const SCORE_VALIDITY_MS = 90 * 24 * 60 * 60 * 1_000;

/** Resolve the source through the current connection, not merely its provider name. */
const getCurrentReputationSnapshot = async (
  identity: Types.ObjectId,
  category: ReputationCategory,
): Promise<ReputationSnapshotDocument | null> => {
  const provider = category === 'developer' ? 'github' : 'x';
  const account = await ExternalAccount.findOne({ identity, provider, status: 'connected' });

  if (!account) {
    return null;
  }

  const cleanup = await ReputationCleanupJob.findOne({ externalAccount: account._id })
    .sort({ cutoff: -1 })
    .lean();

  const sourceFilter = {
    identity,
    externalAccount: account._id,
    providerAccountId: account.providerAccountId,
    ...(cleanup ? { collectedAt: { $gt: cleanup.cutoff } } : {}),
  };

  const candidates = ReputationSnapshot.find({
    identity,
    category,
    calculatedAt: { $gte: new Date(Date.now() - SCORE_VALIDITY_MS) },
    'sources.0.provider': provider,
    'sources.1': { $exists: false },
  })
    .sort({ calculatedAt: -1 })
    .cursor();

  for await (const reputation of candidates) {
    const source = reputation.sources[0];

    if (!source) {
      continue;
    }

    const filter = { ...sourceFilter, _id: source.snapshot };

    const dataExists =
      category === 'developer'
        ? await GitHubDataSnapshot.exists(filter)
        : await XDataSnapshot.exists(filter);

    if (!dataExists) {
      continue;
    }

    const stillConnected = await ExternalAccount.exists({
      _id: account._id,
      identity,
      provider,
      providerAccountId: account.providerAccountId,
      status: 'connected',
    });

    return stillConnected ? reputation : null;
  }

  return null;
};

export default getCurrentReputationSnapshot;
