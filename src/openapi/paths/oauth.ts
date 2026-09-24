import oauthProviderPaths from '../../utils/openapi/oauthProviderPaths.js';

const oauthPaths = {
  ...oauthProviderPaths('github', 'GitHub'),
  ...oauthProviderPaths('gitlab', 'GitLab'),
  ...oauthProviderPaths('x', 'X'),
};

export default oauthPaths;
