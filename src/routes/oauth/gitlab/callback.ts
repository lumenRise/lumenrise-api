import type { RequestHandler } from 'express';

import env from '../../../env.js';
import log from '../../../logger.js';
import { setSessionCookie } from '../../../services/auth/session.js';
import { OAUTH_STATE_COOKIE_NAME } from '../../../constants/auth.js';
import { completeGitLabAuthorization } from '../../../services/oauth/gitlab.js';
import type { GitLabOAuthResultStatus } from '../../../types/integration/gitlab.js';
import {
  clearOAuthStateCookie,
  matchesOAuthStateCookie,
} from '../../../services/oauth/stateCookie.js';

const createClientRedirect = (
  status: GitLabOAuthResultStatus,
  username?: string,
  syncJobId?: string,
): string => {
  const redirectUrl = new URL('/onboarding', env.CLIENT_ORIGIN);

  redirectUrl.searchParams.set('provider', 'gitlab');
  redirectUrl.searchParams.set('status', status);

  if (username) {
    redirectUrl.searchParams.set('username', username);
  }

  if (syncJobId) {
    redirectUrl.searchParams.set('syncJobId', syncJobId);
  }

  return redirectUrl.toString();
};
const callbackGitLabOAuthRoute: RequestHandler = async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const denied = typeof req.query.error === 'string';
  const stateMatches = state
    ? matchesOAuthStateCookie(req.cookies[OAUTH_STATE_COOKIE_NAME], state)
    : false;

  clearOAuthStateCookie(res);

  if (!code || !state || denied || !stateMatches) {
    return res.redirect(302, createClientRedirect('error'));
  }

  try {
    const result = await completeGitLabAuthorization(code, state);

    setSessionCookie(res, result.session);

    return res.redirect(
      302,
      createClientRedirect(
        'success',
        result.connection.username,
        result.connection.syncJobId,
      ),
    );
  } catch (error) {
    log.warn({ error }, 'GitLab OAuth callback failed');

    return res.redirect(302, createClientRedirect('error'));
  }
};

export default callbackGitLabOAuthRoute;
