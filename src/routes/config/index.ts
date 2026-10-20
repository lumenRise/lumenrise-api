import { Router } from 'express';

import getConfiguration from './get';

const configRoutes = Router();

configRoutes.get('/', getConfiguration);

export default configRoutes;
