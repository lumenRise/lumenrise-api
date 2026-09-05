import { Router } from 'express';

import getConnectionsRoute from './get.js';
import deleteConnectionRoute from './delete.js';
import requireSession from '../../middleware/requireSession.js';

const connectionRoutes = Router();

connectionRoutes.get('/', requireSession, getConnectionsRoute);
connectionRoutes.delete('/:provider', requireSession, deleteConnectionRoute);

export default connectionRoutes;
