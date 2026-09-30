import { Router } from 'express';

import getApiKeys from './getApiKeys';
import postApiKey from './postApiKey';
import deleteApiKey from './deleteApiKey';
import getOwnProfile from './getOwnProfile';
import requireSession from '../../middleware/requireSession';
import requireDeveloperApiKey from '../../middleware/requireDeveloperApiKey';

const developerRoutes = Router();

developerRoutes.get('/keys', requireSession, getApiKeys);
developerRoutes.post('/keys', requireSession, postApiKey);
developerRoutes.delete('/keys/:id', requireSession, deleteApiKey);
developerRoutes.get('/profile', requireDeveloperApiKey, getOwnProfile);

export default developerRoutes;
