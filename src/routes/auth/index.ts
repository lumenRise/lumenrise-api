import { Router } from 'express';

import getSessionRoute from './getSession';
import deleteSessionRoute from './deleteSession';
import getWalletStatusRoute from './getWalletStatus';
import requireSession from '../../middleware/requireSession';
import { postWalletAuthRoute, postWalletChallengeRoute } from './wallet';

const authRoutes = Router();

authRoutes.get('/wallet/status', getWalletStatusRoute);
authRoutes.post('/wallet/challenge', postWalletChallengeRoute);
authRoutes.post('/wallet/login', postWalletAuthRoute('login'));
authRoutes.post('/wallet/register', postWalletAuthRoute('register'));

authRoutes.get('/session', requireSession, getSessionRoute);
authRoutes.delete('/session', requireSession, deleteSessionRoute);

export default authRoutes;
