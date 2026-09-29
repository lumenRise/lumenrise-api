import { Router } from 'express';

import getConnectionsRoute from './get.js';
import postXSyncRoute from './postXSync.js';
import getXSyncJobRoute from './getXSyncJob.js';
import deleteConnectionRoute from './delete.js';
import postGitHubSyncRoute from './postGitHubSync.js';
import getGitHubSyncJobRoute from './getGitHubSyncJob.js';
import requireSession from '../../middleware/requireSession.js';

const connectionRoutes = Router();

connectionRoutes.get('/', requireSession, getConnectionsRoute);

connectionRoutes.post('/github/sync', requireSession, postGitHubSyncRoute);
connectionRoutes.get('/github/sync/:jobId', requireSession, getGitHubSyncJobRoute);

connectionRoutes.post('/x/sync', requireSession, postXSyncRoute);
connectionRoutes.get('/x/sync/:jobId', requireSession, getXSyncJobRoute);

connectionRoutes.delete('/:provider', requireSession, deleteConnectionRoute);

export default connectionRoutes;
