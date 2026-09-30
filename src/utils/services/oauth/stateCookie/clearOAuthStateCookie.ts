import type { Response } from 'express';

import env from '../../../../env';
import { OAUTH_STATE_COOKIE_NAME } from '../../../../constants/auth';
const clearOAuthStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/v1/oauth',
  });
};

export { clearOAuthStateCookie };
