import { Router } from 'express';

import getChart from './getChart';
import getTrades from './getTrades';
import postTrade from './postTrade';
import getMarket from './getMarket';
import getLaunchesRoute from './get';
import getHolders from './getHolders';
import getLaunchTeam from './team/get';
import putLaunchTeamMember from './team/put';
import getLaunchImageRoute from './getImage';
import postPrelaunchRoute from './postPrelaunch';
import deleteLaunchTeamMember from './team/delete';
import getTeamCandidates from './team/getCandidates';
import getTeamInvitations from './team/getInvitations';
import putExternalTeamMember from './team/putExternal';
import patchTeamInvitation from './team/patchInvitation';
import postExternalTeamMember from './team/postExternal';
import getLaunchByContractIdRoute from './getByContractId';
import deleteExternalTeamMember from './team/deleteExternal';
import requireSession from '../../middleware/requireSession';
import teamImageUpload from '../../middleware/teamImageUpload';
import tokenImageUpload from '../../middleware/tokenImageUpload';
import resolveLaunchSlug from '../../middleware/resolveLaunchSlug';
import requireLaunchOwner from '../../middleware/requireLaunchOwner';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.get('/team/invitations', requireSession, getTeamInvitations);

launchRoutes.get('/prelaunch/:imageId', requireSession, getLaunchImageRoute);
launchRoutes.post('/prelaunch', requireSession, tokenImageUpload, postPrelaunchRoute);

launchRoutes.patch('/:slug/team/invitation', requireSession, resolveLaunchSlug, patchTeamInvitation);

launchRoutes.get(
  '/:slug/team/candidates',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  getTeamCandidates,
);
launchRoutes.get('/:slug/team', requireSession, resolveLaunchSlug, requireLaunchOwner, getLaunchTeam);
launchRoutes.post(
  '/:slug/team/external',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  teamImageUpload,
  postExternalTeamMember,
);
launchRoutes.put(
  '/:slug/team/external/:memberId',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  teamImageUpload,
  putExternalTeamMember,
);
launchRoutes.delete(
  '/:slug/team/external/:memberId',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  deleteExternalTeamMember,
);
launchRoutes.put(
  '/:slug/team/:identityId',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  putLaunchTeamMember,
);
launchRoutes.delete(
  '/:slug/team/:identityId',
  requireSession,
  resolveLaunchSlug,
  requireLaunchOwner,
  deleteLaunchTeamMember,
);

launchRoutes.get('/:slug/trades', resolveLaunchSlug, getTrades);
launchRoutes.get('/:slug/holders', resolveLaunchSlug, getHolders);
launchRoutes.post('/:slug/trades', requireSession, resolveLaunchSlug, postTrade);
launchRoutes.get('/:slug/market', resolveLaunchSlug, getMarket);
launchRoutes.get('/:slug/chart', resolveLaunchSlug, getChart);
launchRoutes.get('/:slug', resolveLaunchSlug, getLaunchByContractIdRoute);

export default launchRoutes;
