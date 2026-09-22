import { Router } from 'express';

import startGitLabOAuthRoute from './start.js';
import connectGitLabOAuthRoute from './connect.js';
import callbackGitLabOAuthRoute from './callback.js';
import requireSession from '../../../middleware/requireSession.js';

const gitlabOAuthRoutes = Router();

gitlabOAuthRoutes.get('/start', startGitLabOAuthRoute);
gitlabOAuthRoutes.get('/connect', requireSession, connectGitLabOAuthRoute);
gitlabOAuthRoutes.get('/callback', callbackGitLabOAuthRoute);

export default gitlabOAuthRoutes;
