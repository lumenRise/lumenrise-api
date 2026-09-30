import type { RuntimeConfiguration } from '../../types/configuration';
import { parseUrl } from '../../utils/services/configuration/validateRuntimeConfiguration/parseUrl';

const validateRuntimeConfiguration = (configuration: RuntimeConfiguration): void => {
  const hasGitHubClientId = configuration.GITHUB_CLIENT_ID.length > 0;
  const hasGitHubClientSecret = configuration.GITHUB_CLIENT_SECRET.length > 0;
  const hasXClientId = configuration.X_CLIENT_ID.length > 0;
  const hasXClientSecret = configuration.X_CLIENT_SECRET.length > 0;

  if (configuration.NODE_ENV === 'production' && configuration.AUTH_JWT_SECRET.length < 32) {
    throw new Error('AUTH_JWT_SECRET must contain at least 32 characters in production');
  }

  if (hasGitHubClientId !== hasGitHubClientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together');
  }

  if (hasXClientId !== hasXClientSecret) {
    throw new Error('X_CLIENT_ID and X_CLIENT_SECRET must be configured together');
  }

  if (
    (hasGitHubClientId || hasXClientId) &&
    !/^[a-f\d]{64}$/i.test(configuration.CREDENTIAL_ENCRYPTION_KEY)
  ) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal key when provider OAuth is configured',
    );
  }

  const clientOrigin = parseUrl(configuration.CLIENT_ORIGIN, 'CLIENT_ORIGIN');
  const stellarHorizonUrl = parseUrl(configuration.STELLAR_HORIZON_URL, 'STELLAR_HORIZON_URL');
  const githubCallbackUrl = parseUrl(configuration.GITHUB_CALLBACK_URL, 'GITHUB_CALLBACK_URL');
  const xCallbackUrl = parseUrl(configuration.X_CALLBACK_URL, 'X_CALLBACK_URL');

  if (
    configuration.NODE_ENV === 'production' &&
    (clientOrigin.protocol !== 'https:' ||
      stellarHorizonUrl.protocol !== 'https:' ||
      githubCallbackUrl.protocol !== 'https:' ||
      xCallbackUrl.protocol !== 'https:')
  ) {
    throw new Error('Client, callback, and provider URLs must use HTTPS in production');
  }

  if (!['http:', 'https:'].includes(stellarHorizonUrl.protocol)) {
    throw new Error('STELLAR_HORIZON_URL must use HTTP or HTTPS');
  }

};

export default validateRuntimeConfiguration;
