import { timingSafeEqual } from 'node:crypto';

import { OAUTH_STATE_COOKIE_TTL_MS } from '../../constants/services/oauth/stateCookie';
import { setOAuthStateCookie } from '../../utils/services/oauth/stateCookie/setOAuthStateCookie';
import { clearOAuthStateCookie } from '../../utils/services/oauth/stateCookie/clearOAuthStateCookie';

const matchesOAuthStateCookie = (cookieState: unknown, queryState: string): boolean => {
  if (typeof cookieState !== 'string') {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieState);
  const queryBuffer = Buffer.from(queryState);

  if (cookieBuffer.length !== queryBuffer.length) {
    return false;
  }

  return timingSafeEqual(cookieBuffer, queryBuffer);
};

export { clearOAuthStateCookie, matchesOAuthStateCookie, setOAuthStateCookie };

export { OAUTH_STATE_COOKIE_TTL_MS };
