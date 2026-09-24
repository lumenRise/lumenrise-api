import type { Response } from 'express';

import { SESSION_COOKIE_NAME } from '../../constants/auth.js';
import { MILLISECONDS_PER_DAY } from '../../constants/services/auth/session.js';
import { issueSession } from '../../utils/services/auth/session/issueSession.js';
import { setSessionCookie } from '../../utils/services/auth/session/setSessionCookie.js';
import { hashSessionToken } from '../../utils/services/auth/session/hashSessionToken.js';
import { getSessionCookieOptions } from '../../utils/services/auth/session/getSessionCookieOptions.js';

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
