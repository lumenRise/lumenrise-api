import type ExternalAccount from '../../../../models/ExternalAccount.js';
import { syncXAccount } from '../../../../services/integration/xSync.js';
import { syncGitHubAccount } from '../../../../services/integration/githubSync.js';
import { syncGitLabAccount } from '../../../../services/integration/gitlabSync.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const synchronizeAccount = async (
  job: IntegrationSyncJobDocument,
  account: NonNullable<Awaited<ReturnType<typeof ExternalAccount.findOne>>>,
) => {
  if (job.provider === 'github') {
    return syncGitHubAccount(account);
  }

  if (job.provider === 'gitlab') {
    return syncGitLabAccount(account);
  }

  return syncXAccount(account);
};

export { synchronizeAccount };
