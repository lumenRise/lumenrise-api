import { fetchGitLabCollection } from './fetchGitLabCollection.js';
import type { GitLabEvent } from '../../../../types/reputation/gitlab.js';

const collectGitLabEvents = async (userId: number, accessToken: string): Promise<GitLabEvent[]> =>
  fetchGitLabCollection<GitLabEvent>(`/api/v4/users/${userId}/events`, accessToken, {
    scope: 'all',
    sort: 'asc',
  });

export { collectGitLabEvents };
