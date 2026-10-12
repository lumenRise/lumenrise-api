import { Router } from 'express';

import getSessionRoute from './getSession';
import getRegistrationStatus from './getRegistrationStatus';
import requireSession from '../../middleware/requireSession';

const authRoutes = Router();

authRoutes.get('/status', getRegistrationStatus);
authRoutes.get('/session', requireSession, getSessionRoute);

export default authRoutes;
