import { Router } from 'express';

import getVolume from './getVolume';
import getMarket from './getMarket';

const statsRoutes = Router();

statsRoutes.get('/market', getMarket);
statsRoutes.get('/volume', getVolume);
statsRoutes.get('/volume/all', getVolume);

export default statsRoutes;
