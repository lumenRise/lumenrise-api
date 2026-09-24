import env from '../../../../env.js';

const getGitLabUrl = (path: string): URL => new URL(path, env.GITLAB_BASE_URL);

export { getGitLabUrl };
