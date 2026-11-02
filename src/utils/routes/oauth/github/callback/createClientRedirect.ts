import env from '../../../../../env';
import parseClientOrigins from '../../../../configuration/parseClientOrigins';
import type { GitHubOAuthResultStatus } from '../../../../../types/integration/github';

const createClientRedirect = (
  status: GitHubOAuthResultStatus,
  username?: string,
  syncJobId?: string,
): string => {
  const redirectUrl = new URL('/onboarding', parseClientOrigins(env.CLIENT_ORIGIN)[0]);

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
