import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';

import env from '../../../../env.js';
import Session from '../../../../models/Session.js';
import { hashSessionToken } from './hashSessionToken.js';
import type { IssuedSession } from '../../../../types/auth/model.js';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/auth/session.js';

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
