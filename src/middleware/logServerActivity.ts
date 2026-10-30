import type { RequestHandler } from 'express';

import log from '../logger';
import serverActivities from '../constants/serverActivities';

const logServerActivity: RequestHandler = (req, res, next): void => {
  const method = req.method;
  const path = req.path;

  const activity = serverActivities.find(
    (item: (typeof serverActivities)[number]): boolean =>
      item.method === method && item.path.test(path),
  );

  if (!activity) {
    next();

    return;
  }

  res.once('finish', (): void => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    log.info(
      {
        chain: req.chain,
        network: req.network,
        method,
        path,
        statusCode: res.statusCode,
        identityId: req.auth?.identityId.toString() ?? res.locals?.registeredIdentityId,
        userId: req.auth?.userId ?? res.locals?.registeredUserId,
        contractId: req.launchIdentity?.contractId,
        launchSlug: req.launchSlug,
      },
      activity.message,
    );
  });

  next();
};

export default logServerActivity;
