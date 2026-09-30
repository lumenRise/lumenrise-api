import env from '../../../../../env';
import type { GitHubOAuthResultStatus } from '../../../../../types/integration/github';
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
