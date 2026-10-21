import { Router } from 'express';

import getMigrations from './get';

const migrationRoutes = Router();

migrationRoutes.get('/', getMigrations);

export default migrationRoutes;
