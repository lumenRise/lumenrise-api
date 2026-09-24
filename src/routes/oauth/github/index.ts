import { Router } from 'express';

import connectGitHubOAuthRoute from './connect.js';
import callbackGitHubOAuthRoute from './callback.js';
import requireSession from '../../../middleware/requireSession.js';

const githubOAuthRoutes = Router();

githubOAuthRoutes.get('/callback', callbackGitHubOAuthRoute);
githubOAuthRoutes.get('/connect', requireSession, connectGitHubOAuthRoute);
githubOAuthRoutes.get('/start', (_req, res) =>
  res.status(410).json({ status: 'error', message: 'Wallet registration is required', result: {} }),
);

export default githubOAuthRoutes;
