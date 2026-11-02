import env from '../../../../../env';
import type { XOAuthResultStatus } from '../../../../../types/integration/x';
import parseClientOrigins from '../../../../configuration/parseClientOrigins';

const createClientRedirect = (status: XOAuthResultStatus, username?: string): string => {
  const redirectUrl = new URL('/onboarding', parseClientOrigins(env.CLIENT_ORIGIN)[0]);

  redirectUrl.searchParams.set('provider', 'x');
  redirectUrl.searchParams.set('status', status);

  if (username) {
    redirectUrl.searchParams.set('username', username);
  }

  return redirectUrl.toString();
};

export { createClientRedirect };
