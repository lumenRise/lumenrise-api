import type { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';

import env from '../../env.js';
import Session from '../../models/Session.js';
import { SESSION_COOKIE_NAME } from '../../constants/auth.js';
import type { IssuedSession } from '../../types/auth/model.js';

const MILLISECONDS_PER_DAY = 86_400_000;
const getSessionCookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(expires ? { expires } : {}),
});
const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const issueSession = async (identityId: Types.ObjectId): Promise<IssuedSession> => {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * MILLISECONDS_PER_DAY);

  await Session.create({
    identity: identityId,
    tokenHash: hashSessionToken(token),
    expiresAt,
    lastSeenAt: now,
  });

  return { token, expiresAt };
};
const setSessionCookie = (res: Response, session: IssuedSession): void => {
  res.cookie(SESSION_COOKIE_NAME, session.token, getSessionCookieOptions(session.expiresAt));
};
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
