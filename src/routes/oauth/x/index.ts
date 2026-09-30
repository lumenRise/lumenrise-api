import { Router } from 'express';

import connectXOAuthRoute from './connect';
import callbackXOAuthRoute from './callback';
import requireSession from '../../../middleware/requireSession';
const xOAuthRoutes = Router();

xOAuthRoutes.get('/callback', callbackXOAuthRoute);
xOAuthRoutes.get('/connect', requireSession, connectXOAuthRoute);
xOAuthRoutes.get('/start', (_req, res) =>
  res.status(410).json({ status: 'error', message: 'Wallet registration is required', result: {} }),
);

export default xOAuthRoutes;
