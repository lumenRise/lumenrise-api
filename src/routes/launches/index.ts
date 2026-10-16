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
import putExternalTeamMember from './team/putExternal';
import postExternalTeamMember from './team/postExternal';
import getLaunchByContractIdRoute from './getByContractId';
import deleteExternalTeamMember from './team/deleteExternal';
import requireSession from '../../middleware/requireSession';
import teamImageUpload from '../../middleware/teamImageUpload';
import tokenImageUpload from '../../middleware/tokenImageUpload';
import requireLaunchOwner from '../../middleware/requireLaunchOwner';

const launchRoutes = Router();

launchRoutes.get('/', getLaunchesRoute);
launchRoutes.get('/prelaunch/:imageId', requireSession, getLaunchImageRoute);
launchRoutes.post('/prelaunch', requireSession, tokenImageUpload, postPrelaunchRoute);

launchRoutes.get(
  '/:contractId/team/candidates',
  requireSession,
  requireLaunchOwner,
  getTeamCandidates,
);
launchRoutes.get('/:contractId/team', requireSession, requireLaunchOwner, getLaunchTeam);
launchRoutes.post(
  '/:contractId/team/external',
  requireSession,
  requireLaunchOwner,
  teamImageUpload,
  postExternalTeamMember,
);
launchRoutes.put(
  '/:contractId/team/external/:memberId',
  requireSession,
  requireLaunchOwner,
  teamImageUpload,
  putExternalTeamMember,
);
launchRoutes.delete(
  '/:contractId/team/external/:memberId',
  requireSession,
  requireLaunchOwner,
  deleteExternalTeamMember,
);
launchRoutes.put(
  '/:contractId/team/:identityId',
  requireSession,
  requireLaunchOwner,
  putLaunchTeamMember,
);
launchRoutes.delete(
  '/:contractId/team/:identityId',
  requireSession,
  requireLaunchOwner,
  deleteLaunchTeamMember,
);

launchRoutes.get('/:contractId/trades', getTrades);
launchRoutes.get('/:contractId/holders', getHolders);
launchRoutes.post('/:contractId/trades', requireSession, postTrade);
launchRoutes.get('/:contractId/market', getMarket);
launchRoutes.get('/:contractId/chart', getChart);
launchRoutes.get('/:contractId', getLaunchByContractIdRoute);

export default launchRoutes;
