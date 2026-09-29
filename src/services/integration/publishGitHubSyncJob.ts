import { publishReputationJob } from './publishReputationJob.js';
import { GITHUB_SYNC_QUEUE } from '../../constants/services/integration/githubSyncQueue.js';

const publishGitHubSyncJob = (jobId: string): Promise<void> =>
  publishReputationJob(GITHUB_SYNC_QUEUE, jobId);

export { publishGitHubSyncJob };
