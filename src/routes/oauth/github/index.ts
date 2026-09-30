import { Router } from 'express';

import connectGitHubOAuthRoute from './connect';
import callbackGitHubOAuthRoute from './callback';
import requireSession from '../../../middleware/requireSession';
const githubOAuthRoutes = Router();

githubOAuthRoutes.get('/callback', callbackGitHubOAuthRoute);
githubOAuthRoutes.get('/connect', requireSession, connectGitHubOAuthRoute);
githubOAuthRoutes.get('/start', (_req, res) =>
  res.status(410).json({ status: 'error', message: 'Wallet registration is required', result: {} }),
);

export default githubOAuthRoutes;
