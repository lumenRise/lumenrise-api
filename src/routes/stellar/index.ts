import { Router } from 'express';

import getStellarAccountRoute from './getAccount';
import getSorobanEvidenceRoute from './getSorobanEvidence';
import requireSession from '../../middleware/requireSession';
import getStellarActivityScoreRoute from './getActivityScore';
import getStellarAccountOperationsRoute from './getAccountOperations';
import { getStellarActivityScanRoute, postStellarActivityScanRoute } from './activityScan';
const stellarRoutes = Router();

stellarRoutes.get('/accounts/:address', requireSession, getStellarAccountRoute);
stellarRoutes.get('/accounts/:address/soroban-evidence', requireSession, getSorobanEvidenceRoute);
stellarRoutes.get('/accounts/:address/activity-scan', requireSession, getStellarActivityScanRoute);
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
stellarRoutes.get(
  '/accounts/:address/activity-score',
  requireSession,
  getStellarActivityScoreRoute,
);

export default stellarRoutes;
