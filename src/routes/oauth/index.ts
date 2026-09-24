import { Router } from 'express';

import xOAuthRoutes from './x/index.js';
import githubOAuthRoutes from './github/index.js';
import gitlabOAuthRoutes from './gitlab/index.js';

const oauthRoutes = Router();

oauthRoutes.use('/x', xOAuthRoutes);
oauthRoutes.use('/github', githubOAuthRoutes);
oauthRoutes.use('/gitlab', gitlabOAuthRoutes);

export default oauthRoutes;
