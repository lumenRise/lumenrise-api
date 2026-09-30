import type { Response } from 'express';

import { SESSION_COOKIE_NAME } from '../../constants/auth';
import { MILLISECONDS_PER_DAY } from '../../constants/services/auth/session';
import { issueSession } from '../../utils/services/auth/session/issueSession';
import { setSessionCookie } from '../../utils/services/auth/session/setSessionCookie';
import { hashSessionToken } from '../../utils/services/auth/session/hashSessionToken';
import { getSessionCookieOptions } from '../../utils/services/auth/session/getSessionCookieOptions';
const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
};

export {
  clearSessionCookie,
  getSessionCookieOptions,
  hashSessionToken,
  issueSession,
  setSessionCookie,
};

export { MILLISECONDS_PER_DAY };
