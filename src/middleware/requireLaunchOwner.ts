import type { RequestHandler } from 'express';

import log from '../logger';
import Launch from '../models/Launch';
import StellarAccount from '../models/StellarAccount';
import parseMarketRequest from '../utils/launch/parseMarketRequest';

const requireLaunchOwner: RequestHandler = async (req, res, next) => {
  const identity = parseMarketRequest(req);

  if (!identity) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch query', result: {} });
  }

  try {
    const launch = await Launch.findOne(identity).select('owner').lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const owner = await StellarAccount.exists({
      identity: req.auth!.identityId,
      address: launch.owner,
      disconnectedAt: null,
    });

    if (!owner) {
      return res
        .status(403)
        .json({
          status: 'error',
          message: 'Only the launch owner can manage the team',
          result: {},
        });
    }

    res.locals.launchIdentity = identity;

    return next();
  } catch (error) {
    log.error({ error }, 'Launch owner lookup failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch ownership check is unavailable', result: {} });
  }
};

export default requireLaunchOwner;
