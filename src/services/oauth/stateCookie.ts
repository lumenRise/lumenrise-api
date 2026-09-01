import type { Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

import env from '../../env.js';
import { OAUTH_STATE_COOKIE_NAME } from '../../constants/auth.js';

const OAUTH_STATE_COOKIE_TTL_MS = 600_000;
const setOAuthStateCookie = (res: Response, state: string): void => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/v1/oauth',
    maxAge: OAUTH_STATE_COOKIE_TTL_MS,
  });
};
const clearOAuthStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/v1/oauth',
  });
};
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
