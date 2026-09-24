import { Router } from 'express';

import xOAuthRoutes from './x/index.js';
import githubOAuthRoutes from './github/index.js';
import gitlabOAuthRoutes from './gitlab/index.js';

const oauthRoutes = Router();

oauthRoutes.use('/github', githubOAuthRoutes);
oauthRoutes.use('/gitlab', gitlabOAuthRoutes);
oauthRoutes.use('/x', xOAuthRoutes);

export default oauthRoutes;
