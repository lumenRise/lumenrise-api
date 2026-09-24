import { getGitLabUrl } from './getGitLabUrl.js';
import type { GitLabUser } from '../../../../types/integration/gitlab.js';

const getAuthenticatedGitLabUser = async (accessToken: string): Promise<GitLabUser> => {
  const response = await fetch(getGitLabUrl('/api/v4/user'), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('GitLab user lookup failed');
  }

  return (await response.json()) as GitLabUser;
};

export { getAuthenticatedGitLabUser };
