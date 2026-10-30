import { Router } from 'express';

import getVolume from './getVolume';

const statsRoutes = Router();

statsRoutes.get('/volume', getVolume);
statsRoutes.get('/volume/all', getVolume);

export default statsRoutes;
