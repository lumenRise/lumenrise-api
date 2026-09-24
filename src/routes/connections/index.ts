import { Router } from 'express';

import getConnectionsRoute from './get.js';
import postXSyncRoute from './postXSync.js';
import getXSyncJobRoute from './getXSyncJob.js';
import deleteConnectionRoute from './delete.js';
import postGitHubSyncRoute from './postGitHubSync.js';
import postGitLabSyncRoute from './postGitLabSync.js';
import getGitHubSyncJobRoute from './getGitHubSyncJob.js';
import getGitLabSyncJobRoute from './getGitLabSyncJob.js';
import requireSession from '../../middleware/requireSession.js';

const connectionRoutes = Router();

connectionRoutes.get('/', requireSession, getConnectionsRoute);
connectionRoutes.get('/x/sync/:jobId', requireSession, getXSyncJobRoute);
connectionRoutes.get('/github/sync/:jobId', requireSession, getGitHubSyncJobRoute);
connectionRoutes.get('/gitlab/sync/:jobId', requireSession, getGitLabSyncJobRoute);
connectionRoutes.post('/github/sync', requireSession, postGitHubSyncRoute);
connectionRoutes.post('/gitlab/sync', requireSession, postGitLabSyncRoute);
connectionRoutes.post('/x/sync', requireSession, postXSyncRoute);
connectionRoutes.delete('/:provider', requireSession, deleteConnectionRoute);

export default connectionRoutes;
