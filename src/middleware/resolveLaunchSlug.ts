import type { RequestHandler } from 'express';

import log from '../logger';
import Launch from '../models/Launch';

const resolveLaunchSlug: RequestHandler = async (req, res, next): Promise<void> => {
  const slug = req.params.slug;

  if (
    typeof slug !== 'string' ||
    slug.length > 100 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
  ) {
    res.status(400).json({ status: 'error', message: 'Invalid launch slug', result: {} });

    return;
  }

  try {
    const launch = await Launch.findOne({ network: req.network, slug }).select('contractId').lean();

    if (!launch) {
      res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });

      return;
    }

    req.launchSlug = slug;
    req.launchIdentity = { network: req.network, contractId: launch.contractId };

    next();
  } catch (error) {
    log.error({ error, slug }, 'Launch slug lookup failed');

    res.status(503).json({ status: 'error', message: 'Launch is temporarily unavailable', result: {} });
  }
};

export default resolveLaunchSlug;
