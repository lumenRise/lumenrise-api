import type ExternalAccount from '../../../../models/ExternalAccount.js';
import { syncXAccount } from '../../../../services/integration/xSync.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const synchronizeAccount = async (
  job: IntegrationSyncJobDocument,
  account: NonNullable<Awaited<ReturnType<typeof ExternalAccount.findOne>>>,
) => {
  if (job.provider === 'x') {
    return syncXAccount(account);
  }

  throw new Error('GitHub sync jobs are handled by the Reputation service');
};

export { synchronizeAccount };
