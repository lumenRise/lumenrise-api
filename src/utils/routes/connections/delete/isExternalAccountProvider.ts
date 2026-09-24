import { EXTERNAL_ACCOUNT_PROVIDERS } from '../../../../constants/integration.js';
import type { ExternalAccountProvider } from '../../../../types/integration/model.js';

const isExternalAccountProvider = (provider: string): provider is ExternalAccountProvider =>
  EXTERNAL_ACCOUNT_PROVIDERS.some((candidate) => candidate === provider);

export { isExternalAccountProvider };
