import type {
  ExternalAccountProvider,
  ExternalAccountStatus,
  OAuthPurpose,
} from '../types/integration/model.js';

const OAUTH_PURPOSES = ['register', 'connect'] as const satisfies readonly OAuthPurpose[];
const EXTERNAL_ACCOUNT_PROVIDERS = [
  'github',
  'gitlab',
  'x',
] as const satisfies readonly ExternalAccountProvider[];
const EXTERNAL_ACCOUNT_STATUSES = [
  'connected',
  'disconnected',
] as const satisfies readonly ExternalAccountStatus[];

export { EXTERNAL_ACCOUNT_PROVIDERS, EXTERNAL_ACCOUNT_STATUSES, OAUTH_PURPOSES };
