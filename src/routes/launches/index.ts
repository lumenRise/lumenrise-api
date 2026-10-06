import { Router } from 'express';

import getLaunchesRoute from './get';
import getLaunchByContractIdRoute from './getByContractId';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);

export default launchRoutes;
