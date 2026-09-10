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

  const snapshot = await syncGitHubAccount(account);

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitHub account must be reauthorized',
      result: {},
    };

    return res.status(409).json(response);
  }

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
