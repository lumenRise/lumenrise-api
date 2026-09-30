import type { Types } from 'mongoose';

import XDataSnapshot from '../../models/XDataSnapshot';
import ExternalAccount from '../../models/ExternalAccount';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot';
import ReputationSnapshot from '../../models/ReputationSnapshot';
import type { ReputationSnapshotDocument } from '../../types/reputation/model';
type Category = 'developer' | 'social';
const SCORE_VALIDITY_MS = 90 * 24 * 60 * 60 * 1_000;

/** Resolve the source through the current connection, not merely its provider name. */
const getCurrentReputationSnapshot = async (
  identity: Types.ObjectId,
  category: Category,
): Promise<ReputationSnapshotDocument | null> => {
  const provider = category === 'developer' ? 'github' : 'x';
  const account = await ExternalAccount.findOne({ identity, provider, status: 'connected' });

  if (!account) {
    return null;
  }

  const sourceFilter = {
    identity,
    externalAccount: account._id,
    providerAccountId: account.providerAccountId,
  };
  const candidates = ReputationSnapshot.find({
    identity,
    category,
    calculatedAt: { $gte: new Date(Date.now() - SCORE_VALIDITY_MS) },
    'sources.0.provider': provider,
    'sources.1': { $exists: false },
  }).sort({ calculatedAt: -1 }).cursor();

  for await (const reputation of candidates) {
    const source = reputation.sources[0];
    if (!source) {
      continue;
    }
    const filter = { ...sourceFilter, _id: source.snapshot };
    const dataExists = category === 'developer'
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
