import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { syncGitHubAccount } from '../../services/integration/githubSync.js';
import type { ConnectionSyncResult } from '../../types/integration/response.js';

const postGitHubSyncRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'github',
    status: 'connected',
  });

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitHub account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const outcome = await syncGitHubAccount(account);

  if (outcome.state === 'reauthorization_required') {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitHub account must be reauthorized',
      result: {},
    };

    return res.status(409).json(response);
  }

  if (outcome.state !== 'synchronized') {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message:
        outcome.state === 'in_progress'
          ? 'GitHub synchronization is already in progress'
          : 'GitHub data was synchronized recently',
      result: {},
    };

    res.setHeader('Retry-After', outcome.retryAfterSeconds.toString());

    return res.status(429).json(response);
  }

  const { snapshot } = outcome;
  const response: ApiResponse<ConnectionSyncResult> = {
    status: 'success',
    message: 'GitHub data synchronized',
    result: {
      provider: 'github',
      username: snapshot.username,
      status: snapshot.status,
      dataVersion: snapshot.dataVersion,
      collectedAt: snapshot.collectedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default postGitHubSyncRoute;
