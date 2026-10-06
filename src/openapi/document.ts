import openApiPaths from './paths';
import openApiComponents from './components';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Lumenrise API',
    version: '0.1.0',
    description:
      'Wallet identity, provider connections, reputation, Stellar activity, and indexed launches. Protected routes accept a bearer token or the session cookie.',
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  tags: [
    { name: 'System' },
    { name: 'Authentication' },
    { name: 'Connections' },
    { name: 'Policies' },
    { name: 'Developers' },
    { name: 'Reputation' },
    { name: 'Stellar' },
    { name: 'Launches' },
  ],
  security: [{ bearerAuth: [] }, { sessionCookie: [] }],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export default openApiDocument;
