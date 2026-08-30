import { Router } from 'express';

import getSessionRoute from './getSession.js';
import deleteSessionRoute from './deleteSession.js';
import requireSession from '../../middleware/requireSession.js';

const authRoutes = Router();

authRoutes.get('/session', requireSession, getSessionRoute);
authRoutes.delete('/session', requireSession, deleteSessionRoute);

export default authRoutes;
