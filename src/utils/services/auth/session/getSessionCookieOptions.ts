import type { CookieOptions } from 'express';

import env from '../../../../env.js';

const getSessionCookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(expires ? { expires } : {}),
});

export { getSessionCookieOptions };
