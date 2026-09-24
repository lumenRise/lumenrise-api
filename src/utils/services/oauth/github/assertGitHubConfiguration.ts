import env from '../../../../env.js';

const assertGitHubConfiguration = (): void => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub OAuth is not configured');
  }
};

export { assertGitHubConfiguration };
