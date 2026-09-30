import authPaths from './paths/auth';
import docsPaths from './paths/docs';
import oauthPaths from './paths/oauth';
import healthPaths from './paths/health';
import policyPaths from './paths/policies';
import stellarPaths from './paths/stellar';
import developerPaths from './paths/developers';
import reputationPaths from './paths/reputation';
import connectionPaths from './paths/connections';

const openApiPaths = {
  ...authPaths,
  ...policyPaths,
  ...developerPaths,
  ...docsPaths,
  ...oauthPaths,
  ...healthPaths,
  ...stellarPaths,
  ...connectionPaths,
  ...reputationPaths,
};

export default openApiPaths;
