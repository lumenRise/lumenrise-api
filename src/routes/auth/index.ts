import { Router } from 'express';

import getSessionRoute from './getSession.js';
import deleteSessionRoute from './deleteSession.js';
import requireSession from '../../middleware/requireSession.js';
import { postWalletAuthRoute, postWalletChallengeRoute } from './wallet.js';

const authRoutes = Router();

authRoutes.post('/wallet/challenge', postWalletChallengeRoute);
authRoutes.post('/wallet/login', postWalletAuthRoute('login'));
authRoutes.post('/wallet/register', postWalletAuthRoute('register'));

authRoutes.get('/session', requireSession, getSessionRoute);
authRoutes.delete('/session', requireSession, deleteSessionRoute);

export default authRoutes;
