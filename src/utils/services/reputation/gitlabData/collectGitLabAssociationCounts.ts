import { getGitLabUrl } from './getGitLabUrl.js';
import type { GitLabAssociationCounts } from '../../../../types/reputation/gitlab.js';

const collectGitLabAssociationCounts = async (
  userId: number,
  accessToken: string,
): Promise<GitLabAssociationCounts> => {
  const response = await fetch(getGitLabUrl(`/api/v4/users/${userId}/associations_count`), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GitLab association count request failed with status ${response.status}`);
  }

  return (await response.json()) as GitLabAssociationCounts;
};

export { collectGitLabAssociationCounts };
