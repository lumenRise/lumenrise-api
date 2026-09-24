import { GITLAB_SYNC_MIN_INTERVAL_MS } from '../../../../constants/integration.js';

const calculateGitLabSyncSchedule = (lastSyncedAt: Date | null, now = new Date()): Date => {
  if (!lastSyncedAt) {
    return now;
  }

  return new Date(Math.max(now.getTime(), lastSyncedAt.getTime() + GITLAB_SYNC_MIN_INTERVAL_MS));
};

export { calculateGitLabSyncSchedule };
