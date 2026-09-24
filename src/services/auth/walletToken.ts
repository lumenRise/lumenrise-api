import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import env from '../../env.js';
import Session from '../../models/Session.js';
import { hashSessionToken } from './session.js';
import type { IssuedWalletSession, WalletAuthTokenPayload } from '../../types/auth/wallet.js';

const developmentSecret = randomBytes(32).toString('hex');
const getSecret = (): string => env.AUTH_JWT_SECRET || developmentSecret;
const signPart = (part: string): Buffer => createHmac('sha256', getSecret()).update(part).digest();

const createWalletToken = (payload: WalletAuthTokenPayload): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsigned = `${header}.${body}`;

  return `${unsigned}.${signPart(unsigned).toString('base64url')}`;
};

const verifyWalletToken = (token: string): WalletAuthTokenPayload | null => {
  const parts = token.split('.');

  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return null;
  }

  const header = parts[0]!;
  const body = parts[1]!;
  const signature = parts[2]!;

  try {
    if (Buffer.from(header, 'base64url').toString() !== '{"alg":"HS256","typ":"JWT"}') {
      return null;
    }

    const expected = signPart(`${header}.${body}`);
    const actual = Buffer.from(signature, 'base64url');

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as WalletAuthTokenPayload;
    const now = Math.floor(Date.now() / 1_000);

    if (
      payload.iss !== 'lumenrise-api' ||
      payload.aud !== 'lumenrise-client' ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      !/^[a-f\d]{24}$/i.test(payload.sid) ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > now ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};
const issueWalletSession = async (
  identityId: Types.ObjectId,
  databaseSession?: ClientSession,
): Promise<IssuedWalletSession> => {
  const sessionId = new Types.ObjectId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * 86_400_000);

  const token = createWalletToken({
    iss: 'lumenrise-api',
    aud: 'lumenrise-client',
    sub: identityId.toString(),
    sid: sessionId.toString(),
    iat: Math.floor(now.getTime() / 1_000),
    exp: Math.floor(expiresAt.getTime() / 1_000),
  });

  await Session.create(
    [
      {
        _id: sessionId,
        identity: identityId,
        tokenHash: hashSessionToken(token),
        expiresAt,
        lastSeenAt: now,
      },
    ],
    databaseSession ? { session: databaseSession } : {},
  );

  return { token, expiresAt, sessionId };
};

export { issueWalletSession, verifyWalletToken };
