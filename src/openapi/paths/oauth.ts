import oauthProviderPaths from '../../utils/openapi/oauthProviderPaths';

const oauthPaths = {
  ...oauthProviderPaths('github', 'GitHub'),
  ...oauthProviderPaths('x', 'X'),
};

export default oauthPaths;
