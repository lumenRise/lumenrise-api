import parseDomain from '../homeDomain/parseDomain';
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
  const testnetHorizonUrl = parseUrl(configuration.STELLAR_TESTNET_HORIZON_URL, 'STELLAR_TESTNET_HORIZON_URL');
  const publicHorizonUrl = parseUrl(configuration.STELLAR_PUBLIC_HORIZON_URL, 'STELLAR_PUBLIC_HORIZON_URL');
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

  if (testnetHorizonUrl.protocol !== 'https:' || publicHorizonUrl.protocol !== 'https:') {
    throw new Error('Home Domain Horizon URLs must use HTTPS');
  }

  const testnetDomain = configuration.STELLAR_TESTNET_HOME_DOMAIN;
  const publicDomain = configuration.STELLAR_PUBLIC_HOME_DOMAIN;

  if ((testnetDomain && !parseDomain(testnetDomain)) || (publicDomain && !parseDomain(publicDomain))) {
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

    if (
      endpoint.protocol !== 'https:' ||
      publicBase.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      publicBase.username ||
      publicBase.password ||
      endpoint.search ||
      endpoint.hash ||
      publicBase.search ||
      publicBase.hash
    ) {
      throw new Error('R2 endpoint and public image URL must be clean HTTPS URLs');
    }

    if (endpoint.origin === publicBase.origin) {
      throw new Error('R2_PUBLIC_BASE_URL must be a public image domain, not the S3 endpoint');
    }
  }

  if (
    !Number.isInteger(configuration.R2_MAX_AVATAR_BYTES) ||
    configuration.R2_MAX_AVATAR_BYTES < 1 ||
    configuration.R2_MAX_AVATAR_BYTES > 10_485_760
  ) {
    throw new Error('R2_MAX_AVATAR_BYTES must be between 1 and 10485760');
  }

};

export default validateRuntimeConfiguration;
