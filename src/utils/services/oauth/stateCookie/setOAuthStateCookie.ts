import type { Response } from 'express';

import env from '../../../../env';
import { OAUTH_STATE_COOKIE_NAME } from '../../../../constants/auth';
import { OAUTH_STATE_COOKIE_TTL_MS } from '../../../../constants/services/oauth/stateCookie';

const setOAuthStateCookie = (res: Response, state: string): void => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/v1/oauth',
    maxAge: OAUTH_STATE_COOKIE_TTL_MS,
  });
};

export { setOAuthStateCookie };
