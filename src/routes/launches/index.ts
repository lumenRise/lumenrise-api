import { Router } from 'express';

import getLaunchesRoute from './get';
import getLaunchImageRoute from './getImage';
import postLaunchImageRoute from './postImage';
import getLaunchByContractIdRoute from './getByContractId';
import requireSession from '../../middleware/requireSession';
import tokenImageUpload from '../../middleware/tokenImageUpload';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.post('/images', requireSession, tokenImageUpload, postLaunchImageRoute);
launchRoutes.get('/images/:imageId', requireSession, getLaunchImageRoute);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);

export default launchRoutes;
