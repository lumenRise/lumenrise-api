import { Router } from 'express';

import getDeveloperReputationRoute from './getDeveloper.js';
import requireSession from '../../middleware/requireSession.js';

const reputationRoutes = Router();

reputationRoutes.get('/developer', requireSession, getDeveloperReputationRoute);

export default reputationRoutes;
