import { Router } from 'express';

import getSessionRoute from './getSession';
import postRegistration from './postRegistration';
import getRegistrationStatus from './getRegistrationStatus';
import requireSession from '../../middleware/requireSession';
import registrationUpload from '../../middleware/registrationUpload';

const authRoutes = Router();

authRoutes.get('/status', getRegistrationStatus);
authRoutes.get('/session', requireSession, getSessionRoute);
authRoutes.post('/register', registrationUpload, postRegistration);

export default authRoutes;
