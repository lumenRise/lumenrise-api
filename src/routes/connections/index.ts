import { Router } from 'express';

import getConnectionsRoute from './get';
import postXSyncRoute from './postXSync';
import getXSyncJobRoute from './getXSyncJob';
import deleteConnectionRoute from './delete';
import postGitHubSyncRoute from './postGitHubSync';
import getGitHubSyncJobRoute from './getGitHubSyncJob';
import requireSession from '../../middleware/requireSession';
const connectionRoutes = Router();

connectionRoutes.get('/', requireSession, getConnectionsRoute);

connectionRoutes.post('/github/sync', requireSession, postGitHubSyncRoute);
connectionRoutes.get('/github/sync/:jobId', requireSession, getGitHubSyncJobRoute);

connectionRoutes.post('/x/sync', requireSession, postXSyncRoute);
connectionRoutes.get('/x/sync/:jobId', requireSession, getXSyncJobRoute);

connectionRoutes.delete('/:provider', requireSession, deleteConnectionRoute);

export default connectionRoutes;
