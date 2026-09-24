import env from '../../../../env.js';

const assertGitLabConfiguration = (): void => {
  if (!env.GITLAB_CLIENT_ID || !env.GITLAB_CLIENT_SECRET) {
    throw new Error('GitLab OAuth is not configured');
  }
};

export { assertGitLabConfiguration };
