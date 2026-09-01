import { Router } from 'express';

import startGitHubOAuthRoute from './start.js';
import connectGitHubOAuthRoute from './connect.js';
import callbackGitHubOAuthRoute from './callback.js';
import requireSession from '../../../middleware/requireSession.js';

const githubOAuthRoutes = Router();

githubOAuthRoutes.get('/start', startGitHubOAuthRoute);
githubOAuthRoutes.get('/connect', requireSession, connectGitHubOAuthRoute);
githubOAuthRoutes.get('/callback', callbackGitHubOAuthRoute);

export default githubOAuthRoutes;
