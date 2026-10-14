import openApiPaths from './paths';
import openApiComponents from './components';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Lumenrise API',
    version: '0.1.0',
    description:
      'Wallet identity, provider connections, reputation, Stellar activity, and indexed launches. Identity routes require the Auth provider user ID in x-user-id; the developer profile route uses X-API-Key. No wallet-signature login, bearer token or session cookie is issued by this API.',
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  tags: [
    { name: 'System' },
    { name: 'Authentication' },
    { name: 'Profile' },
    { name: 'Connections' },
    { name: 'Policies' },
    { name: 'Developers' },
    { name: 'Reputation' },
    { name: 'Stellar' },
    { name: 'Launches' },
  ],
  security: [{ userIdHeader: [] }],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export default openApiDocument;
