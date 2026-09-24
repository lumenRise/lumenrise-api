import authPaths from './paths/auth.js';
import docsPaths from './paths/docs.js';
import oauthPaths from './paths/oauth.js';
import healthPaths from './paths/health.js';
import policyPaths from './paths/policies.js';
import stellarPaths from './paths/stellar.js';
import reputationPaths from './paths/reputation.js';
import connectionPaths from './paths/connections.js';

const openApiPaths = {
  ...authPaths,
  ...policyPaths,
  ...docsPaths,
  ...oauthPaths,
  ...healthPaths,
  ...stellarPaths,
  ...connectionPaths,
  ...reputationPaths,
};

export default openApiPaths;
