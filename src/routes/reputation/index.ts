import { Router } from 'express';

import getProfileRoute from './getProfile.js';
import getXSocialRoute from './getXSocial.js';
import getSocialScoreRoute from './getSocialScore.js';
import getStellarReputationRoute from './getStellar.js';
import getSybilEvidenceRoute from './getSybilEvidence.js';
import getDeveloperReputationRoute from './getDeveloper.js';
import getDeveloperScoreRoute from './getDeveloperScore.js';
import requireSession from '../../middleware/requireSession.js';
import getDeveloperRepositoriesRoute from './getDeveloperRepositories.js';

const reputationRoutes = Router();

reputationRoutes.get('/profile', requireSession, getProfileRoute);
reputationRoutes.get('/sybil/evidence', requireSession, getSybilEvidenceRoute);
reputationRoutes.get('/developer', requireSession, getDeveloperReputationRoute);
reputationRoutes.get('/social/x', requireSession, getXSocialRoute);
reputationRoutes.get('/social/score', requireSession, getSocialScoreRoute);
reputationRoutes.get('/stellar', requireSession, getStellarReputationRoute);
reputationRoutes.get('/developer/score', requireSession, getDeveloperScoreRoute);
reputationRoutes.get('/developer/repositories', requireSession, getDeveloperRepositoriesRoute);

export default reputationRoutes;
