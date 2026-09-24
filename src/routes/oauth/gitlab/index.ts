import { Router } from 'express';

import connectGitLabOAuthRoute from './connect.js';
import callbackGitLabOAuthRoute from './callback.js';
import requireSession from '../../../middleware/requireSession.js';

const gitlabOAuthRoutes = Router();

gitlabOAuthRoutes.get('/start', (_req, res) =>
  res.status(410).json({ status: 'error', message: 'Wallet registration is required', result: {} }),
);
gitlabOAuthRoutes.get('/connect', requireSession, connectGitLabOAuthRoute);
gitlabOAuthRoutes.get('/callback', callbackGitLabOAuthRoute);

export default gitlabOAuthRoutes;
