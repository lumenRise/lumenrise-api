import { publishReputationJob } from './publishReputationJob';
import { GITHUB_SYNC_QUEUE } from '../../constants/services/integration/githubSyncQueue';
const publishGitHubSyncJob = (jobId: string): Promise<void> =>
  publishReputationJob(GITHUB_SYNC_QUEUE, jobId);

export { publishGitHubSyncJob };
