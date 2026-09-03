import { Router } from 'express';

import getDeveloperReputationRoute from './getDeveloper.js';
import requireSession from '../../middleware/requireSession.js';
import getDeveloperRepositoriesRoute from './getDeveloperRepositories.js';

const reputationRoutes = Router();

reputationRoutes.get('/developer', requireSession, getDeveloperReputationRoute);
reputationRoutes.get('/developer/repositories', requireSession, getDeveloperRepositoriesRoute);

export default reputationRoutes;
