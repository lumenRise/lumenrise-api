import { getGitLabUrl } from './getGitLabUrl.js';
import type { GitLabTokenResponse } from '../../../../types/integration/gitlab.js';

const requestGitLabToken = async (body: URLSearchParams): Promise<GitLabTokenResponse> => {
  const response = await fetch(getGitLabUrl('/oauth/token'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const result = (await response.json()) as GitLabTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'GitLab token exchange failed');
  }

  return result;
};

export { requestGitLabToken };
