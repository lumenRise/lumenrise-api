import { Router } from 'express';

import getStellarAccountRoute from './getAccount.js';
import requireSession from '../../middleware/requireSession.js';
import getStellarAccountOperationsRoute from './getAccountOperations.js';

const stellarRoutes = Router();

stellarRoutes.get('/accounts/:address', requireSession, getStellarAccountRoute);
stellarRoutes.get(
  '/accounts/:address/operations',
  requireSession,
  getStellarAccountOperationsRoute,
);

export default stellarRoutes;
