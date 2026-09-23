import { Router } from 'express';

import getStellarAccountRoute from './getAccount.js';
import requireSession from '../../middleware/requireSession.js';
import getStellarAccountOperationsRoute from './getAccountOperations.js';
import { getStellarActivityScanRoute, postStellarActivityScanRoute } from './activityScan.js';

const stellarRoutes = Router();

stellarRoutes.get('/accounts/:address', requireSession, getStellarAccountRoute);
stellarRoutes.get(
  '/accounts/:address/operations',
  requireSession,
  getStellarAccountOperationsRoute,
);
stellarRoutes.post(
  '/accounts/:address/activity-scan',
  requireSession,
  postStellarActivityScanRoute,
);
stellarRoutes.get('/accounts/:address/activity-scan', requireSession, getStellarActivityScanRoute);

export default stellarRoutes;
