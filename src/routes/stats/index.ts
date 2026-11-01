import { Router } from 'express';

import getChart from './getChart';
import getTrades from './getTrades';
import getVolume from './getVolume';
import getMarket from './getMarket';

const statsRoutes = Router();

statsRoutes.get('/chart', getChart);
statsRoutes.get('/trades', getTrades);
statsRoutes.get('/market', getMarket);
statsRoutes.get('/volume', getVolume);
statsRoutes.get('/volume/all', getVolume);

export default statsRoutes;
