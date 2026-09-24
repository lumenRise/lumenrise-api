import env from '../../../../env.js';

const getGitLabUrl = (path: string): string => new URL(path, env.GITLAB_BASE_URL).toString();

export { getGitLabUrl };
