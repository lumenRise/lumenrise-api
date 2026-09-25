import XDataSnapshot from '../../models/XDataSnapshot.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import type { SybilProviderEvidence } from '../../types/sybil/evidence.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';

const getProviderEvidence = async (
  account: ExternalAccountDocument,
): Promise<SybilProviderEvidence> => {
  const filter = { identity: account.identity, externalAccount: account._id };
  const snapshot =
    account.provider === 'github'
      ? await GitHubDataSnapshot.findOne(filter).sort({ collectedAt: -1 })
      : account.provider === 'gitlab'
        ? await GitLabDataSnapshot.findOne(filter).sort({ collectedAt: -1 })
        : await XDataSnapshot.findOne(filter).sort({ collectedAt: -1 });

  return {
    provider: account.provider,
    snapshot: snapshot
      ? {
          id: snapshot._id.toString(),
          status: snapshot.status,
          dataVersion: snapshot.dataVersion,
          collectedAt: snapshot.collectedAt.toISOString(),
        }
      : null,
  };
};

export default getProviderEvidence;
