import { getGitLabUrl } from './getGitLabUrl.js';
import { getNextPageUrl } from './getNextPageUrl.js';
import { GITLAB_PAGE_SIZE } from '../../../../constants/services/reputation/gitlabData.js';

const fetchGitLabCollection = async <T>(
  path: string,
  accessToken: string,
  parameters: Record<string, string> = {},
): Promise<T[]> => {
  const initialUrl = getGitLabUrl(path);
  const items: T[] = [];

  initialUrl.searchParams.set('per_page', GITLAB_PAGE_SIZE.toString());

  for (const [key, value] of Object.entries(parameters)) {
    initialUrl.searchParams.set(key, value);
  }

  let nextUrl: string | null = initialUrl.toString();

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab collection request failed with status ${response.status}`);
    }

    const page = (await response.json()) as T[];

    items.push(...page);
    nextUrl = getNextPageUrl(response);
  }

  return items;
};

export { fetchGitLabCollection };
