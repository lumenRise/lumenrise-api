import oauthProviderPaths from '../../utils/openapi/oauthProviderPaths.js';

const oauthPaths = {
  ...oauthProviderPaths('github', 'GitHub'),
  ...oauthProviderPaths('x', 'X'),
};

export default oauthPaths;
