import type { RequestHandler } from 'express';

import log from '../../../logger.js';
import { setSessionCookie } from '../../../services/auth/session.js';
import { OAUTH_STATE_COOKIE_NAME } from '../../../constants/auth.js';
import { completeGitHubAuthorization } from '../../../services/oauth/github.js';
import { createClientRedirect } from '../../../utils/routes/oauth/github/callback/createClientRedirect.js';
import {
  clearOAuthStateCookie,
  matchesOAuthStateCookie,
} from '../../../services/oauth/stateCookie.js';

const callbackGitHubOAuthRoute: RequestHandler = async (req, res) => {
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
    const result = await completeGitHubAuthorization(code, state);

    setSessionCookie(res, result.session);

    return res.redirect(
      302,
      createClientRedirect('success', result.connection.username, result.connection.syncJobId),
    );
  } catch (error) {
    log.warn({ error }, 'GitHub OAuth callback failed');

    return res.redirect(302, createClientRedirect('error'));
  }
};

export default callbackGitHubOAuthRoute;
