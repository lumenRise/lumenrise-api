import type { RequestHandler } from 'express';

import Identity from '../models/Identity';
import { parseExternalUserId } from '../services/auth/provider';

const requireSession: RequestHandler = async (req, res, next) => {
  const userId = parseExternalUserId(req.get('x-user-id'));
  if (!userId) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Authentication required', result: {} });
  }

  const identity = await Identity.findOne({ externalUserId: userId }).select('_id status');

  if (!identity) {
    return res.status(401).json({ status: 'error', message: 'Unknown user ID', result: {} });
  }

  if (identity.status !== 'active') {
    return res.status(403).json({ status: 'error', message: 'Identity is not active', result: {} });
  }

  req.auth = { identityId: identity._id, userId };

  return next();
};

export default requireSession;
