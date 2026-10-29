import { Router } from 'express';

import getVolume from './getVolume';

const statsRoutes = Router();

statsRoutes.get('/volume', getVolume);

export default statsRoutes;
