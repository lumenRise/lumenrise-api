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
    const accountActivity = res.locals.accountActivity;

    if (
      res.statusCode < 200 ||
      res.statusCode >= 300 ||
      ('requiresAccountActivity' in activity && !accountActivity)
    ) {
      return;
    }

    log.info(
      {
        chain: req.chain,
        network: req.network,
        method,
        path,
        statusCode: res.statusCode,
        identityId: req.auth?.identityId.toString(),
        userId: req.auth?.userId,
        ...accountActivity,
        contractId: req.launchIdentity?.contractId,
        launchSlug: req.launchSlug,
      },
      activity.message,
    );
  });

  next();
};

export default logServerActivity;
