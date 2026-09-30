import { EXTERNAL_ACCOUNT_PROVIDERS } from '../../../../constants/integration';
import type { ExternalAccountProvider } from '../../../../types/integration/model';
const isExternalAccountProvider = (provider: string): provider is ExternalAccountProvider =>
  EXTERNAL_ACCOUNT_PROVIDERS.some((candidate) => candidate === provider);

export { isExternalAccountProvider };
