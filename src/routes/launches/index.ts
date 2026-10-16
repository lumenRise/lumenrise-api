import { Router } from 'express';

import getChart from './getChart';
import getTrades from './getTrades';
import postTrade from './postTrade';
import getMarket from './getMarket';
import getLaunchesRoute from './get';
import getHolders from './getHolders';
import getLaunchImageRoute from './getImage';
import postPrelaunchRoute from './postPrelaunch';
import getLaunchByContractIdRoute from './getByContractId';
import requireSession from '../../middleware/requireSession';
import tokenImageUpload from '../../middleware/tokenImageUpload';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.get('/prelaunch/:imageId', requireSession, getLaunchImageRoute);
launchRoutes.post('/prelaunch', requireSession, tokenImageUpload, postPrelaunchRoute);

launchRoutes.get('/:contractId/trades', getTrades);
launchRoutes.get('/:contractId/holders', getHolders);
launchRoutes.post('/:contractId/trades', requireSession, postTrade);
launchRoutes.get('/:contractId/market', getMarket);
launchRoutes.get('/:contractId/chart', getChart);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);

export default launchRoutes;
