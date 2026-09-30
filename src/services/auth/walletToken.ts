import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

import env from '../../env';
import Session from '../../models/Session';
import { hashSessionToken } from './session';
import type { IssuedWalletSession } from '../../types/auth/wallet';
import { developmentSecret } from '../../constants/services/auth/walletToken';
import { verifyWalletToken } from '../../utils/services/auth/walletToken/verifyWalletToken';
import { createWalletToken } from '../../utils/services/auth/walletToken/createWalletToken';

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

export { developmentSecret };
