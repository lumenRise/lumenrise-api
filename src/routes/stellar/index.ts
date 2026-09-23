import { Router } from 'express';

import getStellarAccountRoute from './getAccount.js';
import requireSession from '../../middleware/requireSession.js';

const stellarRoutes = Router();

stellarRoutes.get('/accounts/:address', requireSession, getStellarAccountRoute);

export default stellarRoutes;
