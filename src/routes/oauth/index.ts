import { Router } from 'express';

import xOAuthRoutes from './x/index';
import githubOAuthRoutes from './github/index';
const oauthRoutes = Router();

oauthRoutes.use('/x', xOAuthRoutes);
oauthRoutes.use('/github', githubOAuthRoutes);

export default oauthRoutes;
