import authPaths from './paths/auth';
import userPaths from './paths/user';
import docsPaths from './paths/docs';
import oauthPaths from './paths/oauth';
import healthPaths from './paths/health';
import configPaths from './paths/config';
import policyPaths from './paths/policies';
import stellarPaths from './paths/stellar';
import launchPaths from './paths/launches';
import developerPaths from './paths/developers';
import reputationPaths from './paths/reputation';
import launchTeamPaths from './paths/launchTeam';
import connectionPaths from './paths/connections';
import launchMarketPaths from './paths/launchMarket';
import withNetworkHeader from '../utils/openapi/withNetworkHeader';
import withCommonResponses from '../utils/openapi/withCommonResponses';

const openApiPaths = withNetworkHeader(
  withCommonResponses({
    ...authPaths,
    ...userPaths,
    ...policyPaths,
    ...developerPaths,
    ...docsPaths,
    ...oauthPaths,
    ...healthPaths,
    ...configPaths,
    ...stellarPaths,
    ...connectionPaths,
    ...reputationPaths,
    ...launchPaths,
    ...launchMarketPaths,
    ...launchTeamPaths,
  }),
);

export default openApiPaths;
