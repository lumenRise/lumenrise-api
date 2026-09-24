import type { Response } from 'express';

import env from '../../../../env.js';
import { OAUTH_STATE_COOKIE_NAME } from '../../../../constants/auth.js';

const clearOAuthStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/v1/oauth',
  });
};

export { clearOAuthStateCookie };
