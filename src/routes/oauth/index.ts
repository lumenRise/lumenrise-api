import { Router } from 'express';

import githubOAuthRoutes from './github/index.js';

const oauthRoutes = Router();

oauthRoutes.use('/github', githubOAuthRoutes);

export default oauthRoutes;
