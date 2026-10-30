import type { RequestHandler } from 'express';

import Identity from '../models/Identity';
import { parseExternalUserId } from '../services/auth/provider';
import verifyPrivyUser from '../services/auth/privy/verifyPrivyUser';
import parsePrivyUserId from '../services/auth/privy/parsePrivyUserId';
import findPrivyIdentity from '../services/auth/privy/findPrivyIdentity';

const requireSession: RequestHandler = async (req, res, next) => {
  const userId =
    req.chain === 'base'
      ? parsePrivyUserId(req.get('x-user-id'))
      : parseExternalUserId(req.get('x-user-id'));

  if (!userId) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Authentication required', result: {} });
  }

  if (req.chain === 'base' && !(await verifyPrivyUser(req.get('authorization'), userId))) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Privy user verification failed', result: {} });
  }

  const identity =
    req.chain === 'base'
      ? await findPrivyIdentity(userId)
      : await Identity.findOne({ externalUserIds: userId }).select('_id status');

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
