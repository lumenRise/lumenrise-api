import { Router } from 'express';

import startXOAuthRoute from './start.js';
import connectXOAuthRoute from './connect.js';
import callbackXOAuthRoute from './callback.js';
import requireSession from '../../../middleware/requireSession.js';

const xOAuthRoutes = Router();

xOAuthRoutes.get('/start', startXOAuthRoute);
xOAuthRoutes.get('/connect', requireSession, connectXOAuthRoute);
xOAuthRoutes.get('/callback', callbackXOAuthRoute);

export default xOAuthRoutes;
