import type { RequestHandler } from 'express';

import Session from '../models/Session.js';
import Identity from '../models/Identity.js';
import { SESSION_COOKIE_NAME } from '../constants/auth.js';
import { hashSessionToken } from '../services/auth/session.js';
import type { ApiResponse, EmptyResult } from '../types/response.js';

const requireSession: RequestHandler = async (req, res, next) => {
  const token = req.cookies[SESSION_COOKIE_NAME] as string | undefined;

  if (!token) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Authentication required',
      result: {},
    };

    return res.status(401).json(response);
  }

  const now = new Date();
  const session = await Session.findOne({
    tokenHash: hashSessionToken(token),
    revokedAt: null,
    expiresAt: { $gt: now },
  });

  if (!session) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid or expired session',
      result: {},
    };

    return res.status(401).json(response);
  }

  const identity = await Identity.findOne({ _id: session.identity, status: 'active' }).select(
    '_id',
  );

  if (!identity) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Identity is not active',
      result: {},
    };

    return res.status(403).json(response);
  }

  req.auth = {
    sessionId: session._id,
    identityId: identity._id,
  };
  session.lastSeenAt = now;
  await session.save();

  return next();
};

export default requireSession;
