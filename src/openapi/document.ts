import openApiPaths from './paths.js';
import openApiComponents from './components.js';

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Lumenrise API',
    version: '0.1.0',
    description:
      'Wallet identity, provider connections, reputation, and Stellar activity. Protected routes accept a bearer token or the session cookie.',
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  tags: [
    { name: 'System' },
    { name: 'Authentication' },
    { name: 'Connections' },
    { name: 'Reputation' },
    { name: 'Stellar' },
  ],
  security: [{ bearerAuth: [] }, { sessionCookie: [] }],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export default openApiDocument;
