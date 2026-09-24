import { timingSafeEqual } from 'node:crypto';

import { OAUTH_STATE_COOKIE_TTL_MS } from '../../constants/services/oauth/stateCookie.js';
import { setOAuthStateCookie } from '../../utils/services/oauth/stateCookie/setOAuthStateCookie.js';
import { clearOAuthStateCookie } from '../../utils/services/oauth/stateCookie/clearOAuthStateCookie.js';

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
