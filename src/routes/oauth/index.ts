import { Router } from 'express';

import githubOAuthRoutes from './github/index.js';
import gitlabOAuthRoutes from './gitlab/index.js';

const oauthRoutes = Router();

oauthRoutes.use('/github', githubOAuthRoutes);
oauthRoutes.use('/gitlab', gitlabOAuthRoutes);

export default oauthRoutes;
