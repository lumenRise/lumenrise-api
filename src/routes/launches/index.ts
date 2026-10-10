import { Router } from 'express';

import getLaunchesRoute from './get';
import getDraftRoute from './getDraft';
import getDraftsRoute from './getDrafts';
import getLaunchImageRoute from './getImage';
import postLaunchDraftRoute from './postDraft';
import postLaunchImageRoute from './postImage';
import patchLaunchDraftRoute from './patchDraft';
import getLaunchByContractIdRoute from './getByContractId';
import requireSession from '../../middleware/requireSession';
import tokenImageUpload from '../../middleware/tokenImageUpload';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.post('/drafts', requireSession, postLaunchDraftRoute);
launchRoutes.get('/drafts', requireSession, getDraftsRoute);
launchRoutes.get('/drafts/:draftId', requireSession, getDraftRoute);
launchRoutes.patch('/drafts/:draftId', requireSession, patchLaunchDraftRoute);
launchRoutes.post('/images', requireSession, tokenImageUpload, postLaunchImageRoute);
launchRoutes.get('/images/:imageId', requireSession, getLaunchImageRoute);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);

export default launchRoutes;
