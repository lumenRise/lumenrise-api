import { Router } from 'express';

import getProfileRoute from './getProfile';
import getXSocialRoute from './getXSocial';
import getSocialScoreRoute from './getSocialScore';
import getStellarReputationRoute from './getStellar';
import getSybilEvidenceRoute from './getSybilEvidence';
import getDeveloperReputationRoute from './getDeveloper';
import getDeveloperScoreRoute from './getDeveloperScore';
import requireSession from '../../middleware/requireSession';
import getDeveloperRepositoriesRoute from './getDeveloperRepositories';
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
