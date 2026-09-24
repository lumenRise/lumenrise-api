import { TOKEN_REFRESH_WINDOW_MS } from '../../../../constants/services/integration/githubSync.js';

const needsCredentialRefresh = (expiresAt: Date | null, now = new Date()): boolean =>
  expiresAt !== null && expiresAt.getTime() <= now.getTime() + TOKEN_REFRESH_WINDOW_MS;

export { needsCredentialRefresh };
