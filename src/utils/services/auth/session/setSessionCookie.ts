import type { Response } from 'express';

import { SESSION_COOKIE_NAME } from '../../../../constants/auth.js';
import type { IssuedSession } from '../../../../types/auth/model.js';
import { getSessionCookieOptions } from './getSessionCookieOptions.js';

const setSessionCookie = (res: Response, session: IssuedSession): void => {
  res.cookie(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.expiresAt));
};

export { setSessionCookie };
