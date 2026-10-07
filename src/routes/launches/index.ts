import { Router } from 'express';

import getLaunchesRoute from './get';
import getLaunchHomeDomainRoute from './getHomeDomain';
import getLaunchByContractIdRoute from './getByContractId';
import requireSession from '../../middleware/requireSession';
import refreshLaunchHomeDomainRoute from './refreshHomeDomain';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);
launchRoutes.get('/:contractId/home-domain', getLaunchHomeDomainRoute);
launchRoutes.post('/:contractId/home-domain/refresh', requireSession, refreshLaunchHomeDomainRoute);

export default launchRoutes;
