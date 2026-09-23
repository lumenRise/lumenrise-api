import type { RuntimeConfiguration } from '../../types/configuration.js';

const parseUrl = (value: string, name: string): URL => {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
};
const validateRuntimeConfiguration = (configuration: RuntimeConfiguration): void => {
  const hasGitHubClientId = configuration.GITHUB_CLIENT_ID.length > 0;
  const hasGitHubClientSecret = configuration.GITHUB_CLIENT_SECRET.length > 0;
  const hasGitLabClientId = configuration.GITLAB_CLIENT_ID.length > 0;
  const hasGitLabClientSecret = configuration.GITLAB_CLIENT_SECRET.length > 0;
  const hasXClientId = configuration.X_CLIENT_ID.length > 0;
  const hasXClientSecret = configuration.X_CLIENT_SECRET.length > 0;

  if (hasGitHubClientId !== hasGitHubClientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together');
  }

  if (hasGitLabClientId !== hasGitLabClientSecret) {
    throw new Error('GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET must be configured together');
  }

  if (hasXClientId !== hasXClientSecret) {
    throw new Error('X_CLIENT_ID and X_CLIENT_SECRET must be configured together');
  }

  if (
    !Number.isFinite(configuration.X_AUTO_SYNC_INTERVAL_HOURS) ||
    configuration.X_AUTO_SYNC_INTERVAL_HOURS < 0
  ) {
    throw new Error('X_AUTO_SYNC_INTERVAL_HOURS must be a nonnegative number');
  }

  if (
    (hasGitHubClientId || hasGitLabClientId || hasXClientId) &&
    !/^[a-f\d]{64}$/i.test(configuration.CREDENTIAL_ENCRYPTION_KEY)
  ) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal key when provider OAuth is configured',
    );
  }

  const clientOrigin = parseUrl(configuration.CLIENT_ORIGIN, 'CLIENT_ORIGIN');
  const gitlabBaseUrl = parseUrl(configuration.GITLAB_BASE_URL, 'GITLAB_BASE_URL');
  const githubCallbackUrl = parseUrl(configuration.GITHUB_CALLBACK_URL, 'GITHUB_CALLBACK_URL');
  const gitlabCallbackUrl = parseUrl(configuration.GITLAB_CALLBACK_URL, 'GITLAB_CALLBACK_URL');
  const xCallbackUrl = parseUrl(configuration.X_CALLBACK_URL, 'X_CALLBACK_URL');

  if (
    configuration.NODE_ENV === 'production' &&
    (clientOrigin.protocol !== 'https:' ||
      gitlabBaseUrl.protocol !== 'https:' ||
      githubCallbackUrl.protocol !== 'https:' ||
      gitlabCallbackUrl.protocol !== 'https:' ||
      xCallbackUrl.protocol !== 'https:')
  ) {
    throw new Error('Client, callback, and provider URLs must use HTTPS in production');
  }
};

export default validateRuntimeConfiguration;
