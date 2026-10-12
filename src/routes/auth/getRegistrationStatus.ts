import type { RequestHandler } from 'express';

import log from '../../logger';
import Identity from '../../models/Identity';
import { parseExternalUserId } from '../../services/auth/provider';

const getRegistrationStatus: RequestHandler = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const userId = parseExternalUserId(req.get('x-user-id'));

  if (!userId) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Valid user ID is required', result: {} });
  }

  try {
    const identity = await Identity.findOne({ externalUserId: userId }).select(
      '_id status name avatarUrl',
    );

    if (!identity) {
      return res.status(200).json({
        status: 'success',
        message: 'Registration status',
        result: { registered: false, userId },
      });
    }

    if (identity.status !== 'active') {
      return res
        .status(403)
        .json({ status: 'error', message: 'Identity is not active', result: {} });
    }

    if (!identity.name?.trim()) {
      return res.status(200).json({
        status: 'success',
        message: 'Registration status',
        result: { registered: false, userId },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Registration status',
      result: {
        registered: true,
        userId,
        identityId: identity._id.toString(),
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
      },
    });
  } catch (error) {
    log.error({ error }, 'Registration status lookup failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Registration status is unavailable', result: {} });
  }
};

export default getRegistrationStatus;
