import { Router } from 'express';

import getApiKeys from './getApiKeys.js';
import postApiKey from './postApiKey.js';
import deleteApiKey from './deleteApiKey.js';
import getOwnProfile from './getOwnProfile.js';
import requireSession from '../../middleware/requireSession.js';
import requireDeveloperApiKey from '../../middleware/requireDeveloperApiKey.js';

const developerRoutes = Router();

developerRoutes.get('/keys', requireSession, getApiKeys);
developerRoutes.post('/keys', requireSession, postApiKey);
developerRoutes.delete('/keys/:id', requireSession, deleteApiKey);
developerRoutes.get('/profile', requireDeveloperApiKey, getOwnProfile);

export default developerRoutes;
