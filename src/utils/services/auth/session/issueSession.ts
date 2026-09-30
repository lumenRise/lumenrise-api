import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';

import env from '../../../../env';
import Session from '../../../../models/Session';
import { hashSessionToken } from './hashSessionToken';
import type { IssuedSession } from '../../../../types/auth/model';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/auth/session';

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

export { issueSession };
