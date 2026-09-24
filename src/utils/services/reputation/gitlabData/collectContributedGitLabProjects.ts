import { fetchGitLabCollection } from './fetchGitLabCollection.js';
import type { GitLabProject } from '../../../../types/reputation/gitlab.js';

const collectContributedGitLabProjects = async (
  userId: number,
  accessToken: string,
): Promise<GitLabProject[]> =>
  fetchGitLabCollection<GitLabProject>(
    `/api/v4/users/${userId}/contributed_projects`,
    accessToken,
    {
      pagination: 'keyset',
      order_by: 'id',
      sort: 'asc',
    },
  );

export { collectContributedGitLabProjects };
