import env from '../../../../../env.js';
import type { GitHubOAuthResultStatus } from '../../../../../types/integration/github.js';

const createClientRedirect = (
  status: GitHubOAuthResultStatus,
  username?: string,
  syncJobId?: string,
): string => {
  const redirectUrl = new URL('/onboarding', env.CLIENT_ORIGIN);

  redirectUrl.searchParams.set('provider', 'github');
  redirectUrl.searchParams.set('status', status);

  if (username) {
    redirectUrl.searchParams.set('username', username);
  }

  if (syncJobId) {
    redirectUrl.searchParams.set('syncJobId', syncJobId);
  }

  return redirectUrl.toString();
};

export { createClientRedirect };
