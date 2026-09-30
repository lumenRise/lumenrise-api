import env from '../../../../../env';
import type { XOAuthResultStatus } from '../../../../../types/integration/x';
const createClientRedirect = (
  status: XOAuthResultStatus,
  username?: string,
  syncJobId?: string,
): string => {
  const redirectUrl = new URL('/onboarding', env.CLIENT_ORIGIN);

  redirectUrl.searchParams.set('provider', 'x');
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
