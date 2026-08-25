import { Router } from 'express';

import getHealthRoute from './get.js';

const healthRoutes = Router();

healthRoutes.get('/', getHealthRoute);

export default healthRoutes;
