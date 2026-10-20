import parseDomain from '../stellar/parseDomain';
import type { RuntimeConfiguration } from '../../types/configuration';
import { parseUrl } from '../../utils/services/configuration/validateRuntimeConfiguration/parseUrl';

const validateRuntimeConfiguration = (configuration: RuntimeConfiguration): void => {
  const hasXClientId = configuration.X_CLIENT_ID.length > 0;
  const hasXClientSecret = configuration.X_CLIENT_SECRET.length > 0;
  const hasGitHubClientId = configuration.GITHUB_CLIENT_ID.length > 0;
  const hasGitHubClientSecret = configuration.GITHUB_CLIENT_SECRET.length > 0;

  const authProviderValues = [
    configuration.AUTH_PROVIDER_API_URL,
    configuration.AUTH_PROVIDER_APP_ID,
    configuration.AUTH_PROVIDER_APP_SECRET,
  ];

  if (authProviderValues.some(Boolean) && !authProviderValues.every(Boolean)) {
    throw new Error(
      'AUTH_PROVIDER_API_URL, AUTH_PROVIDER_APP_ID and AUTH_PROVIDER_APP_SECRET must be configured together',
    );
  }

  if (configuration.NODE_ENV === 'production' && !authProviderValues.every(Boolean)) {
    throw new Error(
      'AUTH_PROVIDER_API_URL, AUTH_PROVIDER_APP_ID and AUTH_PROVIDER_APP_SECRET are required in production',
    );
  }

  if (configuration.AUTH_PROVIDER_API_URL) {
    const url = parseUrl(configuration.AUTH_PROVIDER_API_URL, 'AUTH_PROVIDER_API_URL');

    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('AUTH_PROVIDER_API_URL must be a clean HTTPS URL');
    }
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
  const stellarHorizonUrls = [
    parseUrl(configuration.STELLAR_TESTNET_HORIZON_URL, 'STELLAR_TESTNET_HORIZON_URL'),
    parseUrl(configuration.STELLAR_PUBLIC_HORIZON_URL, 'STELLAR_PUBLIC_HORIZON_URL'),
  ];
  const githubCallbackUrl = parseUrl(configuration.GITHUB_CALLBACK_URL, 'GITHUB_CALLBACK_URL');
  const xCallbackUrl = parseUrl(configuration.X_CALLBACK_URL, 'X_CALLBACK_URL');

  if (
    configuration.NODE_ENV === 'production' &&
    (clientOrigin.protocol !== 'https:' ||
      stellarHorizonUrls.some((url: URL): boolean => url.protocol !== 'https:') ||
      githubCallbackUrl.protocol !== 'https:' ||
      xCallbackUrl.protocol !== 'https:')
  ) {
    throw new Error('Client, callback, and provider URLs must use HTTPS in production');
  }

  if (stellarHorizonUrls.some((url: URL): boolean => !['http:', 'https:'].includes(url.protocol))) {
    throw new Error('Stellar Horizon URLs must use HTTP or HTTPS');
  }

  const testnetDomain = configuration.STELLAR_TESTNET_HOME_DOMAIN;
  const publicDomain = configuration.STELLAR_PUBLIC_HOME_DOMAIN;

  if (
    (testnetDomain && !parseDomain(testnetDomain)) ||
    (publicDomain && !parseDomain(publicDomain))
  ) {
    throw new Error('Managed Home Domain values must be valid DNS hostnames');
  }

  if (testnetDomain && publicDomain && parseDomain(testnetDomain) === parseDomain(publicDomain)) {
    throw new Error('Testnet and public managed Home Domains must differ');
  }

  const r2Values = [
    configuration.R2_ENDPOINT,
    configuration.R2_ACCESS_KEY_ID,
    configuration.R2_SECRET_ACCESS_KEY,
    configuration.R2_BUCKET_NAME,
    configuration.R2_PUBLIC_BASE_URL,
  ];

  if (r2Values.some(Boolean) && !r2Values.every(Boolean)) {
    throw new Error('All R2 settings must be configured together');
  }

  if (r2Values.every(Boolean)) {
    const endpoint = parseUrl(configuration.R2_ENDPOINT, 'R2_ENDPOINT');
    const publicBase = parseUrl(configuration.R2_PUBLIC_BASE_URL, 'R2_PUBLIC_BASE_URL');
    const hasAllowedProtocol = (url: URL): boolean =>
      url.protocol === 'https:' ||
      (configuration.NODE_ENV === 'development' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));

    if (
      !hasAllowedProtocol(endpoint) ||
      !hasAllowedProtocol(publicBase) ||
      endpoint.username ||
      endpoint.password ||
      publicBase.username ||
      publicBase.password ||
      endpoint.search ||
      endpoint.hash ||
      publicBase.search ||
      publicBase.hash
    ) {
      throw new Error(
        'R2 endpoint and public image URL must be clean HTTPS URLs (HTTP loopback URLs are allowed in development)',
      );
    }

    if (endpoint.origin === publicBase.origin) {
      throw new Error('R2_PUBLIC_BASE_URL must be a public image domain, not the S3 endpoint');
    }
  }

  if (
    !Number.isInteger(configuration.R2_MAX_IMAGE_BYTES) ||
    configuration.R2_MAX_IMAGE_BYTES < 1 ||
    configuration.R2_MAX_IMAGE_BYTES > 10_485_760
  ) {
    throw new Error('R2_MAX_IMAGE_BYTES must be between 1 and 10485760');
  }
};

export default validateRuntimeConfiguration;
